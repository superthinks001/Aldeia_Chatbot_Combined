import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import "./slider.css"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <div style={{ width: '100%', padding: '10px 0', position: 'relative' }}>
    <SliderPrimitive.Root
      ref={ref}
      className={cn("slider-root", className)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        touchAction: 'none',
        userSelect: 'none',
        height: '20px'
      }}
      {...props}
    >
      <SliderPrimitive.Track 
        className="slider-track"
        style={{
          position: 'relative',
          flexGrow: 1,
          height: '8px',
          backgroundColor: '#e5e5e5',
          borderRadius: '9999px',
          overflow: 'hidden',
          width: '100%'
        }}
      >
        <SliderPrimitive.Range 
          className="slider-range"
          style={{
            position: 'absolute',
            height: '100%',
            backgroundColor: '#ff6b4a',
            borderRadius: '9999px',
            left: 0,
            right: 0
          }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb 
        className="slider-thumb"
        style={{
          display: 'block',
          width: '20px',
          height: '20px',
          backgroundColor: '#ffffff',
          border: '2px solid #ff6b4a',
          borderRadius: '50%',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          outline: 'none',
          position: 'relative',
          zIndex: 1
        }}
      />
    </SliderPrimitive.Root>
  </div>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
