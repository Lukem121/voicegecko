import React from "react";

// Size of hitbox in device pixel size
export interface BoxSize {
  top: number,
  left: number,
  width: number,
  height: number
}

type BoxProps = {
  children: React.ReactNode,
  box_size: BoxSize
}

export const Box: React.FC<BoxProps> = ({children, box_size} ) => {
  // add something interactive in box to test if we can click it
  return (
    <div
      style={{
        "top": `${box_size.top}px`,
        "left": `${box_size.left}px`,
        "width": `${box_size.width}px`,
        "height": `${box_size.height}px`,
        "position": "absolute",
        "color": "white",
        "backgroundColor": "rgba(1,1,1,0.7)"
      }}
    >
      {children}
    </div>
  )
}

/**
 * 
 * @param device_x: x coordinate of cursor on device
 * @param device_y: y coordinate of cursor on device
 * @param web_box_size: box size in web page
 * @returns: whether or not cursor is in box
 */
export function isInBox(device_x: number, device_y: number, web_box_size: BoxSize): boolean {
  const top = web_box_size.top;
  const left = web_box_size.left;
  const width = web_box_size.width;
  const height = web_box_size.height;
  device_x = device_x / window.devicePixelRatio;
  device_y = device_y / window.devicePixelRatio;

  return device_x >= left && device_x <= left + width && 
         device_y >= top && device_y <= top + height;
}