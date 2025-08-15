'use client';

import { cn } from '@acme/ui/lib/utils';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas-lite';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function GeckoWithCursorTracking({
  className,
}: {
  className?: string;
}) {
  // IMPORTANT: Eyes are centered at 40, 30.
  const [position, setPosition] = useState({
    LxAxis: 40,
    LyAxis: 30,
    RxAxis: 40,
    RyAxis: 30,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  const { rive, RiveComponent } = useRive({
    src: '/assets/images/geckos/rive/voicegeckoeyes.riv',
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  const LyAxisInput = useStateMachineInput(rive, 'State Machine 1', 'LyAxis'); // Left eye y-axis
  const LxAxisInput = useStateMachineInput(rive, 'State Machine 1', 'LxAxis'); // Left eye x-axis
  const RyAxisInput = useStateMachineInput(rive, 'State Machine 1', 'RyAxis'); // Right eye y-axis
  const RxAxisInput = useStateMachineInput(rive, 'State Machine 1', 'RxAxis'); // Right eye x-axis

  // Update state machine inputs when position changes
  useEffect(() => {
    if (rive && LyAxisInput && LxAxisInput && RyAxisInput && RxAxisInput) {
      LyAxisInput.value = position.LyAxis;
      LxAxisInput.value = position.LxAxis;
      RyAxisInput.value = position.RyAxis;
      RxAxisInput.value = position.RxAxis;
    }
  }, [position, rive, LyAxisInput, LxAxisInput, RyAxisInput, RxAxisInput]);

  // Calculate eye position based on cursor position relative to eye center
  const calculateEyePosition = useCallback(
    (
      cursorX: number,
      cursorY: number,
      eyeCenterX: number,
      eyeCenterY: number
    ) => {
      // Calculate distance from eye center to cursor
      const deltaX = cursorX - eyeCenterX;
      const deltaY = cursorY - eyeCenterY;

      // Maximum distance the eye can move from center (adjust these values to fine-tune)
      const maxMoveX = 35; // How far the eye can move horizontally from center (40) - increased for better cross-eyed effect
      const maxMoveY = 25; // How far the eye can move vertically from center (30) - increased range

      // Maximum distance to consider for full eye movement - reduced for more sensitivity
      const maxDistance = 100; // Pixels from eye center where eye reaches maximum movement

      // Calculate the distance and constrain it
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const constrainedDistance = Math.min(distance, maxDistance);

      // Calculate movement factor (0 to 1) with minimum sensitivity
      const movementFactor = Math.max(0.1, constrainedDistance / maxDistance);

      // Calculate angle
      const angle = Math.atan2(deltaY, deltaX);

      // Calculate new eye position with enhanced sensitivity for small distances
      const sensitivityMultiplier = distance < 50 ? 1.5 : 1; // Extra sensitivity when cursor is close
      const moveX =
        Math.cos(angle) * maxMoveX * movementFactor * sensitivityMultiplier;
      const moveY =
        Math.sin(angle) * maxMoveY * movementFactor * sensitivityMultiplier;

      return {
        x: 40 + moveX, // Center (40) + movement
        y: 30 + moveY, // Center (30) + movement
      };
    },
    []
  );

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!leftEyeRef.current) {
        return;
      }
      if (!rightEyeRef.current) {
        return;
      }

      // Get cursor position relative to the page
      const cursorX = event.clientX;
      const cursorY = event.clientY;

      // Get eye center positions
      const leftEyeRect = leftEyeRef.current.getBoundingClientRect();
      const rightEyeRect = rightEyeRef.current.getBoundingClientRect();

      const leftEyeCenterX = leftEyeRect.left + leftEyeRect.width / 2;
      const leftEyeCenterY = leftEyeRect.top + leftEyeRect.height / 2;

      const rightEyeCenterX = rightEyeRect.left + rightEyeRect.width / 2;
      const rightEyeCenterY = rightEyeRect.top + rightEyeRect.height / 2;

      // Calculate new eye positions
      const leftEyePos = calculateEyePosition(
        cursorX,
        cursorY,
        leftEyeCenterX,
        leftEyeCenterY
      );
      const rightEyePos = calculateEyePosition(
        cursorX,
        cursorY,
        rightEyeCenterX,
        rightEyeCenterY
      );

      // Update state
      setPosition({
        LxAxis: leftEyePos.x,
        LyAxis: leftEyePos.y,
        RxAxis: rightEyePos.x,
        RyAxis: rightEyePos.y,
      });
    },
    [calculateEyePosition]
  );

  // Add mouse move listener
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div
      className={cn('relative inline-block h-40 w-40', className)}
      ref={containerRef}
    >
      <div
        className="absolute inset-0 top-[18%] left-[43%] size-1"
        data-name="left-eye"
        ref={leftEyeRef}
      />
      <div
        className="absolute inset-0 top-[17%] left-[67%] size-1"
        data-name="right-eye"
        ref={rightEyeRef}
      />
      <RiveComponent />
    </div>
  );
}
