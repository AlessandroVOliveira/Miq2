preciso de um plano de implementação para adição de um modulo de chat para os usuarios que utilizam a plataforma esse plano tem que ser dividido em etapas para não sobrecarregar o agente utilizado para construção

esse modulo vai utilizar a Evolution api e iremos construir uma interface dentro da plataforma para que os técnicos atendam os clientes essa é a fase 5 e 6 descrita no readme

também é necessário uma tela de configuração para conectar no whatsapp que mostre o qr code

cada usuário pode ver na interface do modulo

chamados em andamento
fila(da sua equipe)
contatos(todos os contatos que já entraram em contato com o chat e poder reabrir uma conversa)
uma tela central onde fica o feed do chat
botão de mensagens pre definidas
botão de emojis
botão de buscar mensagens na conversa e geral
tratar visualmente a função responder uma mensagem especifica
tratar multimidia
tratar comandos de ouvir áudio
ter a possibilidade de transferir chamados inter equipes
poder classificar o chat, ter uma opção para adicionar tipos de classificação no encerramento do atendimento
poder escrever comentários no encerramento do chat
poder editar o nome que fica salvo no modulo de atendimento
poder adicionar mensagens pre definidas


é necessário também a configuração de um chatbot

quando o cliente mandar uma mensagem para o numero o chatbot deve:

mostrar uma mensagens de boas vindas
dar opções numéricas para saber para qual fila de qual equipe ele deve mandar o chamado
após encerrar o chamado mostrar uma mensagem solicitando uma nota de 1 a 10 para o cliente
após receber a nota mostrar uma mensagem de agradecimento
ver a possibilidade de essas configurações estarem presentes junto as configurações de conexão com o whatsapp para ficar personalizável
importante o chatbot não deve ser uma ia, somente ter opções personalizáveis para evitar engenharia social


importante armazenar os dados das mensagens como chat, hora e data, nota recebida, nome do contato, classificação do chat, comentarios dados pelo técnico, etc

ter endpoints de conexão para um powerbi poder coletar dados
esse powerbi é externo, achar uma maneira de visualizar ele no app ou só ter um link para abrir em outra aba
ter algum tipo de configuração de segurança para os endpoints
suportar a configuração das apis whatsapp grátis e a paga
ter as instruções de como configurar as apis whatsapp  paga e a gratis 