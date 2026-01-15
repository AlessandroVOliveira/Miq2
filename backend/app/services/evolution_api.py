"""Evolution API service for WhatsApp communication."""
import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class EvolutionAPIError(Exception):
    """Exception for Evolution API errors."""
    def __init__(self, message: str, status_code: int = None, response: dict = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class EvolutionAPIService:
    """Service for communicating with Evolution API."""
    
    def __init__(self):
        self.base_url = os.getenv("EVOLUTION_API_URL", "http://evolution-api:8080")
        self.api_key = os.getenv("EVOLUTION_API_KEY", "miq2-evolution-default-key")
        self.timeout = 30.0
    
    def _get_headers(self, instance_api_key: str = None) -> Dict[str, str]:
        """Get headers for API requests."""
        return {
            "Content-Type": "application/json",
            "apikey": instance_api_key or self.api_key
        }
    
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        data: dict = None, 
        instance_api_key: str = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Evolution API."""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers(instance_api_key)
        
        logger.info(f"Evolution API request: {method} {url}")
        logger.debug(f"Headers: {headers}")
        if data:
            logger.debug(f"Data: {data}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method == "GET":
                    response = await client.get(url, headers=headers)
                elif method == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                logger.info(f"Evolution API response: {response.status_code}")
                
                if response.status_code >= 400:
                    try:
                        error_data = response.json() if response.text else {}
                    except Exception:
                        error_data = {"raw": response.text}
                    
                    error_msg = error_data.get("message", error_data.get("error", f"HTTP {response.status_code}"))
                    logger.error(f"Evolution API error: {response.status_code} - {error_data}")
                    
                    raise EvolutionAPIError(
                        message=str(error_msg),
                        status_code=response.status_code,
                        response=error_data
                    )
                
                return response.json() if response.text else {}
                
        except httpx.ConnectError as e:
            logger.error(f"Connection error to Evolution API: {e}")
            raise EvolutionAPIError(f"Não foi possível conectar à Evolution API: {e}")
        except httpx.TimeoutException as e:
            logger.error(f"Timeout connecting to Evolution API: {e}")
            raise EvolutionAPIError(f"Timeout ao conectar com Evolution API: {e}")
    
    # ==================== Instance Management ====================
    
    async def create_instance(
        self,
        instance_name: str,
        integration: str = "WHATSAPP-BAILEYS",
        qrcode: bool = True,
        webhook_url: str = None,
        token: str = None,
        number: str = None
    ) -> Dict[str, Any]:
        """Create a new WhatsApp instance."""
        data = {
            "instanceName": instance_name,
            "integration": integration,
            "qrcode": qrcode
        }
        
        # For Business API, token and number are required
        if token:
            data["token"] = token
        if number:
            data["number"] = self._format_number(number)
        
        if webhook_url:
            data["webhook"] = {
                "enabled": True,
                "url": webhook_url,
                "events": [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "CONNECTION_UPDATE",
                    "QRCODE_UPDATED",
                    "CONTACTS_UPSERT"
                ]
            }
        
        result = await self._request("POST", "/instance/create", data)
        logger.info(f"Instance created: {instance_name}")
        return result
    
    async def connect_instance(self, instance_name: str) -> Dict[str, Any]:
        """Connect instance and get QR code."""
        return await self._request("GET", f"/instance/connect/{instance_name}")
    
    async def get_connection_state(self, instance_name: str) -> Dict[str, Any]:
        """Get connection state of instance."""
        result = await self._request("GET", f"/instance/connectionState/{instance_name}")
        # Normalize response format
        if "instance" in result and "state" in result.get("instance", {}):
            return {"state": result["instance"]["state"]}
        return result
    
    async def fetch_instances(self) -> List[Dict[str, Any]]:
        """List all instances."""
        return await self._request("GET", "/instance/fetchInstances")
    
    async def restart_instance(self, instance_name: str) -> Dict[str, Any]:
        """Restart instance connection."""
        return await self._request("PUT", f"/instance/restart/{instance_name}")
    
    async def logout_instance(self, instance_name: str) -> Dict[str, Any]:
        """Logout from WhatsApp (requires new QR scan)."""
        return await self._request("DELETE", f"/instance/logout/{instance_name}")
    
    async def delete_instance(self, instance_name: str) -> Dict[str, Any]:
        """Delete instance completely."""
        return await self._request("DELETE", f"/instance/delete/{instance_name}")
    
    async def set_presence(
        self, 
        instance_name: str, 
        presence: str = "available"
    ) -> Dict[str, Any]:
        """Set presence status (available, unavailable, composing, recording)."""
        return await self._request(
            "POST", 
            f"/instance/setPresence/{instance_name}",
            {"presence": presence}
        )
    
    # ==================== Messages ====================
    
    async def send_text(
        self,
        instance_name: str,
        number: str,
        text: str,
        delay: int = 0,
        link_preview: bool = True
    ) -> Dict[str, Any]:
        """Send text message."""
        data = {
            "number": self._format_number(number),
            "text": text,
            "delay": delay,
            "linkPreview": link_preview
        }
        return await self._request("POST", f"/message/sendText/{instance_name}", data)
    
    async def send_media(
        self,
        instance_name: str,
        number: str,
        media_type: str,
        media_base64: str,
        caption: str = None,
        filename: str = None,
        mimetype: str = None
    ) -> Dict[str, Any]:
        """Send media message (image, video, document)."""
        data = {
            "number": self._format_number(number),
            "mediatype": media_type,
            "media": media_base64,  # Pure base64 string OR data URL
            "mimetype": mimetype or "application/octet-stream"
        }
        if caption:
            data["caption"] = caption
        if filename:
            data["fileName"] = filename
            
        return await self._request("POST", f"/message/sendMedia/{instance_name}", data)
    
    async def send_audio(
        self,
        instance_name: str,
        number: str,
        audio_url: str
    ) -> Dict[str, Any]:
        """Send audio as voice message (PTT)."""
        data = {
            "number": self._format_number(number),
            "audio": audio_url
        }
        return await self._request("POST", f"/message/sendWhatsAppAudio/{instance_name}", data)
    
    async def get_base64_from_media(
        self,
        instance_name: str,
        message_id: str,
        remote_jid: str,
        from_me: bool = False
    ) -> Dict[str, Any]:
        """Get base64 encoded media from a message."""
        data = {
            "message": {
                "key": {
                    "remoteJid": remote_jid,
                    "fromMe": from_me,
                    "id": message_id
                }
            },
            "convertToMp4": False
        }
        return await self._request("POST", f"/chat/getBase64FromMediaMessage/{instance_name}", data)
    
    async def send_reaction(
        self,
        instance_name: str,
        remote_jid: str,
        message_id: str,
        from_me: bool,
        reaction: str
    ) -> Dict[str, Any]:
        """Send reaction to a message."""
        data = {
            "key": {
                "remoteJid": remote_jid,
                "fromMe": from_me,
                "id": message_id
            },
            "reaction": reaction
        }
        return await self._request("POST", f"/message/sendReaction/{instance_name}", data)
    
    # ==================== Chat Management ====================
    
    async def mark_message_as_read(
        self,
        instance_name: str,
        remote_jid: str,
        message_id: str,
        from_me: bool = False
    ) -> Dict[str, Any]:
        """Mark message as read."""
        data = {
            "readMessages": [{
                "remoteJid": remote_jid,
                "fromMe": from_me,
                "id": message_id
            }]
        }
        return await self._request("POST", f"/chat/markMessageAsRead/{instance_name}", data)
    
    async def send_presence(
        self,
        instance_name: str,
        number: str,
        presence: str = "composing",
        delay: int = 3000
    ) -> Dict[str, Any]:
        """Send typing/recording presence."""
        data = {
            "number": self._format_number(number),
            "presence": presence,
            "delay": delay
        }
        return await self._request("POST", f"/chat/sendPresence/{instance_name}", data)
    
    async def find_contacts(
        self,
        instance_name: str,
        where: dict = None
    ) -> List[Dict[str, Any]]:
        """Find contacts."""
        data = {"where": where or {}}
        return await self._request("POST", f"/chat/findContacts/{instance_name}", data)
    
    async def find_messages(
        self,
        instance_name: str,
        remote_jid: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Find messages for a chat."""
        data = {
            "where": {"remoteJid": remote_jid},
            "limit": limit
        }
        return await self._request("POST", f"/chat/findMessages/{instance_name}", data)
    
    async def find_chats(self, instance_name: str) -> List[Dict[str, Any]]:
        """Find all chats."""
        data = {"where": {}}
        return await self._request("POST", f"/chat/findChats/{instance_name}", data)
    
    async def fetch_profile_picture(
        self,
        instance_name: str,
        number: str
    ) -> Dict[str, Any]:
        """Get profile picture URL."""
        data = {"number": self._format_number(number)}
        return await self._request("POST", f"/chat/fetchProfilePictureUrl/{instance_name}", data)
    
    async def check_whatsapp_numbers(
        self,
        instance_name: str,
        numbers: List[str]
    ) -> List[Dict[str, Any]]:
        """Check if numbers have WhatsApp."""
        data = {"numbers": [self._format_number(n) for n in numbers]}
        return await self._request("POST", f"/{instance_name}/chat/whatsappNumbers", data)
    
    # ==================== Helpers ====================
    
    def _format_number(self, number: str) -> str:
        """Format phone number (remove non-digits)."""
        # Remove all non-digit characters
        cleaned = "".join(filter(str.isdigit, number))
        return cleaned
    
    def parse_jid_to_number(self, jid: str) -> str:
        """Extract phone number from JID."""
        # 5511999999999@s.whatsapp.net -> 5511999999999
        if "@" in jid:
            return jid.split("@")[0]
        return jid
    
    def format_jid(self, number: str) -> str:
        """Format number to JID."""
        cleaned = self._format_number(number)
        return f"{cleaned}@s.whatsapp.net"
    
    async def fetch_profile_picture(
        self,
        instance_name: str,
        number: str
    ) -> Optional[str]:
        """Fetch profile picture URL for a WhatsApp number."""
        try:
            data = {"number": self._format_number(number)}
            result = await self._request(
                "POST", 
                f"/chat/fetchProfilePictureUrl/{instance_name}", 
                data
            )
            return result.get("profilePictureUrl")
        except EvolutionAPIError:
            return None


# Singleton instance
evolution_api = EvolutionAPIService()
