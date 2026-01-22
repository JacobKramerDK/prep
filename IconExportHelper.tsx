import React, { useRef } from 'react';
import { AppIcon, AppIconMonogram } from './AppIcon';
import { Download } from 'lucide-react';
/**
 * IconExportHelper - Utility component to help export app icons
 *
 * This component displays the app icon at various sizes and provides
 * instructions for creating proper app icons for Electron.
 *
 * Add this to your app temporarily to generate icons, then remove it.
 */
export function IconExportHelper() {
  const sizes = [512, 256, 128, 64, 32, 16];
  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          App Icon Export Helper
        </h1>
        <p className="text-secondary mb-8">
          Use these icons for your Electron app. Right-click and "Save Image As"
          or take screenshots.
        </p>

        {/* Sparkle Icon Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            Sparkle Icon (Recommended)
          </h2>
          <div className="bg-surface border border-border rounded-xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {sizes.map((size) =>
              <div key={size} className="flex flex-col items-center gap-3">
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <AppIcon size={size} />
                  </div>
                  <span className="text-sm font-medium text-secondary">
                    {size}×{size}px
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monogram Icon Variants */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            Monogram Icon (Alternative)
          </h2>
          <div className="bg-surface border border-border rounded-xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {sizes.map((size) =>
              <div key={size} className="flex flex-col items-center gap-3">
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <AppIconMonogram size={size} />
                  </div>
                  <span className="text-sm font-medium text-secondary">
                    {size}×{size}px
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-surface-hover border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            How to Use These Icons
          </h3>

          <div className="space-y-4 text-sm text-secondary">
            <div>
              <h4 className="font-semibold text-primary mb-2">
                For Electron (macOS):
              </h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>
                  Save icons at all sizes (512px, 256px, 128px, 64px, 32px,
                  16px)
                </li>
                <li>
                  Use an icon converter tool to create{' '}
                  <code className="px-1 py-0.5 bg-surface rounded text-xs">
                    icon.icns
                  </code>
                </li>
                <li>Place in your Electron app's build resources folder</li>
                <li>
                  Reference in{' '}
                  <code className="px-1 py-0.5 bg-surface rounded text-xs">
                    package.json
                  </code>{' '}
                  or electron-builder config
                </li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">
                For Electron (Windows):
              </h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Save icons at 256px, 128px, 64px, 48px, 32px, 16px</li>
                <li>
                  Use an icon converter tool to create{' '}
                  <code className="px-1 py-0.5 bg-surface rounded text-xs">
                    icon.ico
                  </code>
                </li>
                <li>Place in your Electron app's build resources folder</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">
                For Electron (Linux):
              </h4>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Save as PNG at 512px (recommended) or 256px</li>
                <li>
                  Name it{' '}
                  <code className="px-1 py-0.5 bg-surface rounded text-xs">
                    icon.png
                  </code>
                </li>
                <li>Place in your Electron app's build resources folder</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-primary mb-2">
                Recommended Tools:
              </h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Online:</strong> CloudConvert, iConvert Icons, AnyConv
                </li>
                <li>
                  <strong>macOS:</strong> Image2Icon, Icon Slate
                </li>
                <li>
                  <strong>Windows:</strong> IcoFX, Greenfish Icon Editor Pro
                </li>
                <li>
                  <strong>CLI:</strong> electron-icon-builder, png2icons
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
          <p className="text-sm text-secondary">
            <strong className="text-primary">Tip:</strong> The sparkle icon
            works better at small sizes (16px, 32px) while the monogram is more
            recognizable at larger sizes. Choose based on your primary use case.
          </p>
        </div>
      </div>
    </div>);

}