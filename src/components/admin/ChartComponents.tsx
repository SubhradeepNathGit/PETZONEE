"use client";

import React from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    RadialLinearScale,
} from 'chart.js';
import { Line, Bar, Doughnut, PolarArea, Radar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Common Chart Options for Glassmorphic Dark Theme
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'rgba(255, 255, 255, 0.9)',
            bodyColor: 'rgba(255, 255, 255, 0.7)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: true,
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
                drawBorder: false,
            },
            ticks: {
                color: 'rgba(255, 255, 255, 0.4)',
                font: {
                    family: "'Inter', sans-serif",
                    size: 10,
                    weight: 600,
                }
            }
        },
        y: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false,
                borderDash: [5, 5],
            },
            ticks: {
                color: 'rgba(255, 255, 255, 0.4)',
                font: {
                    family: "'Inter', sans-serif",
                    size: 10,
                    weight: 600,
                }
            }
        }
    },
    interaction: {
        mode: 'index' as const,
        intersect: false,
    },
};

interface ChartProps {
    data: any;
    height?: number;
}

export const RevenueLineChart = ({ data, height = 300, multi = false }: any) => {
    const chartData = {
        labels: multi ? data[0].data.map((d: any) => d.name) : data.map((d: any) => d.name),
        datasets: multi ? data.map((set: any, i: number) => ({
            label: set.label,
            data: set.data.map((d: any) => d.value),
            borderColor: set.color || (i === 0 ? '#10b981' : '#f59e0b'),
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                const color = set.color || (i === 0 ? '#10b981' : '#f59e0b');
                gradient.addColorStop(0, `${color}33`); // 20% opacity
                gradient.addColorStop(1, `${color}00`); // 0% opacity
                return gradient;
            },
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: set.color || (i === 0 ? '#10b981' : '#f59e0b'),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
        })) : [
            {
                label: 'Revenue (₹)',
                data: data.map((d: any) => d.value),
                borderColor: '#10b981',
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                    return gradient;
                },
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            }
        ]
    };

    const options = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            legend: {
                display: multi,
                position: 'top' as const,
                labels: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    font: { size: 10, weight: 600 }
                }
            }
        }
    };

    return (
        <div style={{ height, width: '100%' }}>
            <Line data={chartData} options={options} />
        </div>
    );
};

export const UserGrowthChart = ({ data, height = 300 }: ChartProps) => {
    const chartData = {
        labels: data.map((d: any) => d.name),
        datasets: [
            {
                label: 'Users',
                data: data.map((d: any) => d.value),
                borderColor: '#3b82f6',
                borderWidth: 3,
                tension: 0, // Stepped look or sharp lines
                stepped: true,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
            }
        ]
    };

    return (
        <div style={{ height, width: '100%' }}>
            <Line data={chartData} options={commonOptions} />
        </div>
    );
};

export const OrdersBarChart = ({ data, height = 300 }: ChartProps) => {
    const chartData = {
        labels: data.map((d: any) => d.name),
        datasets: [
            {
                label: 'Orders',
                data: data.map((d: any) => d.value),
                backgroundColor: '#f59e0b',
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 'flex' as const,
                maxBarThickness: 40,
            }
        ]
    };

    return (
        <div style={{ height, width: '100%' }}>
            <Bar data={chartData} options={commonOptions} />
        </div>
    );
};

export const CategoryDoughnutChart = ({ data, height = 300 }: ChartProps) => {
    const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

    const chartData = {
        labels: data.map((d: any) => d.name),
        datasets: [
            {
                data: data.map((d: any) => d.value),
                backgroundColor: COLORS,
                borderColor: '#0a0a0a',
                borderWidth: 2,
                hoverOffset: 4,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                display: true,
                position: 'right' as const,
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: 600,
                    },
                    usePointStyle: true,
                    padding: 20,
                }
            },
            tooltip: commonOptions.plugins.tooltip,
        }
    };

    return (
        <div style={{ height, width: '100%' }}>
            <Doughnut data={chartData} options={options} />
        </div>
    );
};

export const AppointmentsPolarArea = ({ data, height = 300 }: ChartProps) => {
    const COLORS = [
        'rgba(16, 185, 129, 0.6)', // Green
        'rgba(245, 158, 11, 0.6)', // Yellow
        'rgba(239, 68, 68, 0.6)'   // Red
    ];

    const BORDER_COLORS = [
        '#10b981',
        '#f59e0b',
        '#ef4444'
    ];

    const chartData = {
        labels: data.map((d: any) => d.name),
        datasets: [{
            data: data.map((d: any) => d.value),
            backgroundColor: COLORS,
            borderColor: BORDER_COLORS,
            borderWidth: 2,
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
                ticks: {
                    display: false,
                },
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.05)',
                }
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: 600,
                    },
                    usePointStyle: true,
                    padding: 20,
                }
            },
            tooltip: commonOptions.plugins.tooltip,
        }
    };

    return (
        <div style={{ height, width: '100%' }}>
            <PolarArea data={chartData} options={options} />
        </div>
    );
};

export const EngagementRadarChart = ({ data, height = 300 }: ChartProps) => {
    const chartData = {
        labels: data.map((d: any) => d.name),
        datasets: [{
            label: 'Engagement Score',
            data: data.map((d: any) => d.value),
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            borderColor: '#8b5cf6',
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#8b5cf6',
            borderWidth: 2,
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    display: false,
                },
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                pointLabels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: 600,
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: commonOptions.plugins.tooltip,
        }
    };

    return (
        <div style={{ height, width: '100%' }}>
            <Radar data={chartData} options={options} />
        </div>
    );
};
