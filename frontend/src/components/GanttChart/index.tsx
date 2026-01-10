/**
 * Gantt chart component for implementation timeline.
 * Displays items with calculated dates based on estimated hours.
 */
import React, { useMemo } from 'react';
import { Card, Empty, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { GanttItem } from '../../types';

interface GanttChartProps {
    items: GanttItem[];
    startDate?: string;
    endDate?: string;
}

const statusColors: Record<string, string> = {
    pending: '#d9d9d9',
    in_progress: '#1890ff',
    completed: '#52c41a',
};

const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
};

const GanttChart: React.FC<GanttChartProps> = ({ items, startDate, endDate }) => {
    const { minDate, maxDate, dateRange, categories, totalHours } = useMemo(() => {
        let min = startDate ? dayjs(startDate) : dayjs();
        let max = endDate ? dayjs(endDate) : min.add(30, 'day');

        items.forEach(item => {
            if (item.start_date) {
                const d = dayjs(item.start_date);
                if (d.isBefore(min)) min = d;
            }
            if (item.end_date) {
                const d = dayjs(item.end_date);
                if (d.isAfter(max)) max = d;
            }
        });

        const days = max.diff(min, 'day') + 1;
        const range: dayjs.Dayjs[] = [];
        for (let i = 0; i < days; i++) {
            range.push(min.add(i, 'day'));
        }

        const cats = [...new Set(items.map(i => i.category || 'Geral'))];
        const hours = items.reduce((sum, i) => sum + (i.estimated_hours || 0), 0);

        return { minDate: min, maxDate: max, dateRange: range, categories: cats, totalHours: hours };
    }, [items, startDate, endDate]);

    if (items.length === 0) {
        return <Empty description="Nenhum item no cronograma. Adicione itens ao checklist com horas estimadas." />;
    }

    const getBarStyle = (item: GanttItem): React.CSSProperties => {
        const start = item.start_date ? dayjs(item.start_date) : minDate;
        const end = item.end_date ? dayjs(item.end_date) : start.add(1, 'day');

        const startOffset = start.diff(minDate, 'day');
        const duration = end.diff(start, 'day') || 1;
        const totalDays = dateRange.length;

        const left = (startOffset / totalDays) * 100;
        const width = (duration / totalDays) * 100;

        return {
            position: 'absolute',
            left: `${Math.max(0, left)}%`,
            width: `${Math.min(width, 100 - left)}%`,
            height: '28px',
            backgroundColor: statusColors[item.status] || '#d9d9d9',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: item.status === 'pending' ? '#666' : 'white',
            fontSize: '11px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
        };
    };

    const formatDateRange = (item: GanttItem) => {
        const start = item.start_date ? dayjs(item.start_date).format('DD/MM') : '-';
        const end = item.end_date ? dayjs(item.end_date).format('DD/MM') : '-';
        return `${start} → ${end}`;
    };

    return (
        <Card
            title={
                <span>
                    Cronograma (Gantt)
                    <Tag color="blue" style={{ marginLeft: 8 }}>Total: {totalHours}h</Tag>
                </span>
            }
            size="small"
        >
            <div style={{ overflowX: 'auto' }}>
                {/* Header with dates */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', marginBottom: 8, minWidth: 800 }}>
                    <div style={{ width: 180, flexShrink: 0, fontWeight: 'bold', padding: '8px', background: '#fafafa' }}>
                        Tarefa
                    </div>
                    <div style={{ width: 60, flexShrink: 0, fontWeight: 'bold', padding: '8px', background: '#fafafa', textAlign: 'center' }}>
                        Horas
                    </div>
                    <div style={{ flex: 1, display: 'flex', background: '#fafafa' }}>
                        {dateRange.filter((_, i) => i % Math.ceil(dateRange.length / 8) === 0).map(date => (
                            <div key={date.format('YYYY-MM-DD')} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#666', padding: '8px 0' }}>
                                {date.format('DD/MM')}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Items grouped by category */}
                {categories.map(category => (
                    <div key={category}>
                        <div style={{ background: '#e6f7ff', padding: '6px 8px', fontWeight: 'bold', color: '#1890ff', borderBottom: '1px solid #91d5ff' }}>
                            {category}
                        </div>
                        {items.filter(i => (i.category || 'Geral') === category).map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', minHeight: 40, borderBottom: '1px solid #f0f0f0', minWidth: 800 }}>
                                <div style={{ width: 180, flexShrink: 0, padding: '4px 8px', fontSize: 13 }}>
                                    <Tooltip title={`${item.title} - ${statusLabels[item.status]}`}>
                                        <span style={{
                                            display: 'block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                                            color: item.status === 'completed' ? '#52c41a' : 'inherit'
                                        }}>
                                            {item.title}
                                        </span>
                                    </Tooltip>
                                </div>
                                <div style={{ width: 60, flexShrink: 0, textAlign: 'center', fontWeight: 'bold', color: '#666' }}>
                                    {item.estimated_hours}h
                                </div>
                                <div style={{ flex: 1, position: 'relative', height: 34, padding: '3px 0' }}>
                                    {(item.start_date || item.end_date) ? (
                                        <Tooltip title={`${formatDateRange(item)} • ${item.estimated_hours}h • ${statusLabels[item.status]}`}>
                                            <div style={getBarStyle(item)}>
                                                {formatDateRange(item)}
                                            </div>
                                        </Tooltip>
                                    ) : (
                                        <Tag style={{ margin: '4px 8px' }} color="warning">Sem datas</Tag>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 16, display: 'flex', gap: 24, padding: '8px', background: '#fafafa', borderRadius: 4 }}>
                <span><span style={{ display: 'inline-block', width: 16, height: 16, background: '#d9d9d9', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} /> Pendente</span>
                <span><span style={{ display: 'inline-block', width: 16, height: 16, background: '#1890ff', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} /> Em Andamento</span>
                <span><span style={{ display: 'inline-block', width: 16, height: 16, background: '#52c41a', borderRadius: 4, marginRight: 6, verticalAlign: 'middle' }} /> Concluído</span>
            </div>

            {/* Summary */}
            <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                <strong>Período:</strong> {startDate ? dayjs(startDate).format('DD/MM/YYYY') : 'Não definido'} até {endDate ? dayjs(endDate).format('DD/MM/YYYY') : 'Não definido'}
                <span style={{ marginLeft: 16 }}><strong>Itens:</strong> {items.length}</span>
                <span style={{ marginLeft: 16 }}><strong>Concluídos:</strong> {items.filter(i => i.status === 'completed').length}</span>
            </div>
        </Card>
    );
};

export default GanttChart;
