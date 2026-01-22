import React from 'react';
interface AppIconProps {
  size?: number;
  className?: string;
}
/**
 * AppIcon - The official Prep app icon
 *
 * Usage:
 * - In UI: <AppIcon size={48} />
 * - For Electron app icon: Export as PNG at 512x512, 256x256, 128x128, 64x64, 32x32, 16x16
 * - For favicon: Export as PNG at 32x32 and 16x16
 *
 * To export as PNG:
 * 1. Render this component at desired size
 * 2. Use html2canvas or similar to capture as image
 * 3. Or recreate in design tool (Figma, Sketch) using these specs
 */
export function AppIcon({ size = 64, className = '' }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}>

      {/* Background - Gradient rounded square */}
      <rect width="64" height="64" rx="14" fill="url(#iconGradient)" />

      {/* Sparkle/Star icon - representing "Prep" and AI assistance */}
      <g transform="translate(32, 32)">
        {/* Center dot */}
        <circle cx="0" cy="0" r="3" fill="white" opacity="0.9" />

        {/* Main sparkle rays */}
        <path
          d="M 0,-16 L 1.5,-6 L 0,-5 L -1.5,-6 Z"
          fill="white"
          opacity="0.95" />

        <path d="M 16,0 L 6,1.5 L 5,0 L 6,-1.5 Z" fill="white" opacity="0.95" />
        <path d="M 0,16 L 1.5,6 L 0,5 L -1.5,6 Z" fill="white" opacity="0.95" />
        <path
          d="M -16,0 L -6,1.5 L -5,0 L -6,-1.5 Z"
          fill="white"
          opacity="0.95" />


        {/* Diagonal sparkle rays */}
        <path d="M 11,-11 L 5,-5 L 4,-6 L 6,-8 Z" fill="white" opacity="0.85" />
        <path d="M 11,11 L 5,5 L 6,4 L 8,6 Z" fill="white" opacity="0.85" />
        <path d="M -11,11 L -5,5 L -4,6 L -6,8 Z" fill="white" opacity="0.85" />
        <path
          d="M -11,-11 L -5,-5 L -6,-4 L -8,-6 Z"
          fill="white"
          opacity="0.85" />

      </g>

      {/* Gradient definition */}
      <defs>
        <linearGradient
          id="iconGradient"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse">

          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>);

}
/**
 * Alternative: Simple "P" monogram version
 */
export function AppIconMonogram({ size = 64, className = '' }: AppIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}>

      <rect width="64" height="64" rx="14" fill="url(#monoGradient)" />

      {/* Letter P */}
      <path
        d="M 20,18 L 20,46 L 26,46 L 26,35 L 36,35 C 41,35 45,31 45,26 C 45,21 41,18 36,18 Z M 26,24 L 35,24 C 37,24 39,25 39,27 C 39,29 37,30 35,30 L 26,30 Z"
        fill="white" />


      <defs>
        <linearGradient
          id="monoGradient"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse">

          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>);

}