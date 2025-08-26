import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Box, BoxSize as BoxPos, isInBox } from './utils';
import Draggable from 'react-draggable';
import "./App.css"
import { useRef } from 'react';

let boxPos: BoxPos = {
  top: 100,
  left: 100,
  width: 200,
  height: 150
}

const appWebview = getCurrentWebviewWindow();
appWebview.setIgnoreCursorEvents(false);

let isIgnored: boolean | null = null;
let isDragging: boolean = false;
// rust backend emits mouse position in "device-mouse-move" event with udev
// frontend can use this as an alternative to the "mousemove" event
appWebview.listen<{ x: number; y: number }>('device-mouse-move', async ({ payload }) => {
  // Note that CSS pixel is different from device pixel.
  // See [this doc](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
  const inHitbox = isInBox(
    payload.x,
    payload.y,
    boxPos
  );
  const shouldIgnore = !isDragging && !inHitbox
  // const shouldIgnore = !isDragging && !inHitbox
  if (shouldIgnore != isIgnored) {
    console.log(`
      x: ${payload.x}, y: ${payload.y}, 
      inHitbox: ${inHitbox}
      isDragging: ${isDragging}
      isIgnored: ${isIgnored} -> ${shouldIgnore}
    `);
    appWebview.setIgnoreCursorEvents(shouldIgnore);
    isIgnored = shouldIgnore;
  }
});

const onStart = () => {
  isDragging = true;
  console.log(`On dragging start, set isDragging to ${isDragging}`)
}

const onStop = (nodeRef: React.RefObject<HTMLElement>) => {
  isDragging = false;
  console.log(`On dragging end, set isDragging to ${isDragging}`)
  if (nodeRef.current) {
    const rect = nodeRef.current.getBoundingClientRect();
    console.log(`Before - Box pos: ${JSON.stringify(boxPos)}`);
    boxPos = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
    console.log(`After - Box pos: ${JSON.stringify(boxPos)}`);
  } else {
    console.log("nodeRef is null, can't update box pos");
  }
}

function App() {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
      <Draggable
        onStart={onStart}
        onStop={() => {
          onStop(nodeRef)
        }}
        handle='.drag-handle'
      >
        <div 
          ref={nodeRef}
          className='container'
          style={{
            top: boxPos.top,
            left: boxPos.left,
            width: boxPos.width,
            height: boxPos.height
          }}
        >
          <div
            className='drag-handle'
            style={{
              position: "relative",
              top: 0,
              left: 0,
              width: "50px",
              height: "50px",
              backgroundColor: "red"
            }}
          ></div>
            <button>
              This is draggable!
            </button>
        </div>
      </Draggable>
  );
}


export default App;
