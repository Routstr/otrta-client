import React, { ReactElement } from 'react';

interface SequenceMessage {
  from: string;
  to: string;
  message: string;
  type: 'arrow' | 'dashed' | 'return';
  condition?: string;
}

interface SequenceStep {
  type: 'message' | 'alt' | 'loop' | 'note';
  content?: SequenceMessage;
  condition?: string;
  steps?: SequenceStep[];
  participant?: string;
  note?: string;
}

interface SequenceDiagramProps {
  participants: string[];
  steps: SequenceStep[];
  className?: string;
}

export const SequenceDiagram: React.FC<SequenceDiagramProps> = ({
  participants,
  steps,
  className = '',
}) => {
  const participantWidth = 200;
  const participantHeight = 60;
  const messageHeight = 45;
  const margin = 50;

  // Calculate total height accounting for nested blocks
  const calculateHeight = (steps: SequenceStep[]): number => {
    let totalHeight = 0;
    steps.forEach((step) => {
      if (step.type === 'alt' || step.type === 'loop') {
        totalHeight += messageHeight + 60; // Block header height
        if (step.steps) {
          totalHeight += step.steps.length * messageHeight + 20; // Nested steps height
        }
      } else {
        totalHeight += messageHeight;
      }
    });
    return totalHeight;
  };

  const width = participants.length * participantWidth + margin * 2;
  const height = 150 + calculateHeight(steps) + 100;

  const getParticipantX = (participant: string) => {
    const index = participants.indexOf(participant);
    return margin + index * participantWidth + participantWidth / 2;
  };

  const renderParticipant = (participant: string, index: number) => {
    const x = margin + index * participantWidth;
    const centerX = x + participantWidth / 2;

    return (
      <g key={participant}>
        {/* Participant box */}
        <rect
          x={x}
          y={20}
          width={participantWidth - 20}
          height={participantHeight}
          fill='#f8f9fa'
          stroke='#6c757d'
          strokeWidth='1'
          rx='8'
        />
        <text
          x={centerX}
          y={55}
          textAnchor='middle'
          fontSize='12'
          fontWeight='600'
          fill='#333'
        >
          {participant}
        </text>

        {/* Lifeline */}
        <line
          x1={centerX}
          y1={participantHeight + 20}
          x2={centerX}
          y2={height - 50}
          stroke='#6c757d'
          strokeWidth='2'
          strokeDasharray='5,5'
        />
      </g>
    );
  };

  const renderMessage = (
    step: SequenceStep,
    yPosition: number,
    messageKey: string
  ) => {
    if (step.type !== 'message' || !step.content) return null;

    const { from, to, message, type } = step.content;
    const fromX = getParticipantX(from);
    const toX = getParticipantX(to);

    const isReturn = type === 'return';
    const isDashed = type === 'dashed' || isReturn;

    return (
      <g key={messageKey}>
        {/* Message line */}
        <line
          x1={fromX}
          y1={yPosition}
          x2={toX}
          y2={yPosition}
          stroke={isReturn ? '#28a745' : '#007bff'}
          strokeWidth='2'
          strokeDasharray={isDashed ? '4,3' : 'none'}
          markerEnd='url(#arrowhead)'
        />

        {/* Message text */}
        <text
          x={(fromX + toX) / 2}
          y={yPosition - 8}
          textAnchor='middle'
          fontSize='11'
          fill='#333'
          fontWeight='500'
        >
          {message}
        </text>
      </g>
    );
  };

  // New rendering approach that tracks position properly
  const renderAllSteps = () => {
    let currentY = 120;
    const elements: ReactElement[] = [];

    steps.forEach((step, stepIndex) => {
      if (step.type === 'message') {
        const messageElement = renderMessage(
          step,
          currentY,
          `msg-${stepIndex}`
        );
        if (messageElement) {
          elements.push(messageElement);
        }
        currentY += messageHeight;
      } else if (step.type === 'alt' && step.steps) {
        // Alt block
        const blockHeight = step.steps.length * messageHeight + 60;

        elements.push(
          <g key={`alt-${stepIndex}`}>
            {/* Alt block background */}
            <rect
              x={margin - 10}
              y={currentY - 15}
              width={width - margin * 2 + 20}
              height={blockHeight}
              fill='#fff3cd'
              stroke='#ffc107'
              strokeWidth='1'
              rx='4'
              opacity='0.3'
            />

            {/* Alt condition */}
            <text
              x={margin + 5}
              y={currentY + 5}
              fontSize='11'
              fontWeight='600'
              fill='#856404'
            >
              alt: {step.condition}
            </text>
          </g>
        );

        currentY += 25; // Space for condition text

        // Render steps inside alt block
        step.steps.forEach((altStep, altIndex) => {
          const messageElement = renderMessage(
            altStep,
            currentY,
            `alt-${stepIndex}-${altIndex}`
          );
          if (messageElement) {
            elements.push(messageElement);
          }
          currentY += messageHeight;
        });

        currentY += 20; // Bottom margin for block
      } else if (step.type === 'loop' && step.steps) {
        // Loop block
        const blockHeight = step.steps.length * messageHeight + 60;

        elements.push(
          <g key={`loop-${stepIndex}`}>
            {/* Loop block background */}
            <rect
              x={margin - 10}
              y={currentY - 15}
              width={width - margin * 2 + 20}
              height={blockHeight}
              fill='#e7f3ff'
              stroke='#007bff'
              strokeWidth='1'
              rx='4'
              opacity='0.3'
            />

            {/* Loop condition */}
            <text
              x={margin + 5}
              y={currentY + 5}
              fontSize='11'
              fontWeight='600'
              fill='#004085'
            >
              loop: {step.condition}
            </text>
          </g>
        );

        currentY += 25; // Space for condition text

        // Render steps inside loop block
        step.steps.forEach((loopStep, loopIndex) => {
          const messageElement = renderMessage(
            loopStep,
            currentY,
            `loop-${stepIndex}-${loopIndex}`
          );
          if (messageElement) {
            elements.push(messageElement);
          }
          currentY += messageHeight;
        });

        currentY += 20; // Bottom margin for block
      }
    });

    return elements;
  };

  return (
    <div className={`flex justify-center ${className}`}>
      <svg width={width} height={height} className='rounded-lg border bg-white'>
        {/* Arrow marker definition */}
        <defs>
          <marker
            id='arrowhead'
            markerWidth='10'
            markerHeight='7'
            refX='9'
            refY='3.5'
            orient='auto'
          >
            <polygon points='0 0, 10 3.5, 0 7' fill='#007bff' />
          </marker>
        </defs>

        {/* Render participants */}
        {participants.map(renderParticipant)}

        {/* Render all steps with proper positioning */}
        {renderAllSteps()}
      </svg>
    </div>
  );
};
