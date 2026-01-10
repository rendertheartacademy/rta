import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, RefreshCcw, GripVertical, Columns, Rows, Layers, Layout } from 'lucide-react';
import { TransformState } from '../types';

interface ComparisonViewerProps {
  refImage: string;
  renderImage: string;
  mode: 'SLIDE' | 'SPLIT_H' | 'SPLIT_V' | 'BLEND' | 'FULL';
  setMode: (mode: 'SLIDE' | 'SPLIT_H' | 'SPLIT_V' | 'BLEND' | 'FULL') => void;
  fullViewSource?: 'REF' | 'RENDER';
  onFullViewToggle?: () => void;
}

const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  refImage,
  renderImage,
  mode,
  setMode,
  fullViewSource = 'RENDER',
  onFullViewToggle
}) => {
  // Global Transform State
  const [transform, setTransform] = useState<TransformState>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Tool Specific State
  const [sliderPosition, setSliderPosition] = useState(50); // 0-100%
  const [blendOpacity, setBlendOpacity] = useState(0.5); // 0-1
  const [isSliding, setIsSliding] = useState(false);

  // Moved ref to the OUTER container so toolbar is included in fullscreen
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Interaction Handlers ---

  // Wheel is safe to keep as native event listener for non-passive prevention
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleSensitivity = 0.001;
      // Zoom logic
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale - e.deltaY * scaleSensitivity, 0.1), 8);
        return {
          ...prev,
          scale: newScale,
        };
      });
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);


  // PANNING LOGIC: Updated to Pointer Events for better capture
  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent dragging if clicking controls
    if ((e.target as HTMLElement).closest('.controls-layer')) return;
    
    // CRITICAL: Prevent default to stop browser native drag/selection
    e.preventDefault();
    e.stopPropagation();

    // CAPTURE POINTER: This fixes the "lost connection" issue when moving fast
    // Use currentTarget to ensure we capture the container div
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    setIsDragging(true);
    setLastPosition({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isSliding) {
        handleSliderDrag(e);
        return;
    }

    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.clientX - lastPosition.x;
    const deltaY = e.clientY - lastPosition.y;

    setTransform(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastPosition({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.currentTarget instanceof Element && e.currentTarget.hasPointerCapture(e.pointerId)) {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }
    
    setIsDragging(false);
    setIsSliding(false);
  };
  
  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDragging(false);
    setIsSliding(false);
  };

  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1 });

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // --- Render Helpers ---

  // Use object-contain logic within the transform to ensure it fits initially
  const imgStyle: React.CSSProperties = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain', 
    userSelect: 'none',
    pointerEvents: 'none', // Let events pass to container for panning
    touchAction: 'none'
  };

  const wrapperStyle = "absolute inset-0 flex items-center justify-center overflow-hidden";

  // Slider Drag Logic
  const handleSliderDrag = (e: React.PointerEvent | React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const position = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(position, 0), 100));
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-[#121212] rounded-lg overflow-hidden border border-zinc-800">
      
      {/* --- TOOLBAR (Top of Image) --- */}
      <div className="h-12 bg-[#0a0a0a] border-b border-zinc-800 flex items-center justify-between px-4 z-40 shrink-0">
          
          {/* Left: Mode Selectors (ICONS ONLY) */}
          <div className="flex items-center gap-1">
             <ToolButton 
                active={mode === 'SLIDE'} 
                onClick={() => setMode('SLIDE')} 
                icon={GripVertical} 
                title="Slide"
             />
             <div className="w-[1px] h-6 bg-zinc-800 mx-1" />
             <ToolButton 
                active={mode === 'SPLIT_H'} 
                onClick={() => setMode('SPLIT_H')} 
                icon={Columns} 
                title="Split Horizontal"
             />
             <ToolButton 
                active={mode === 'SPLIT_V'} 
                onClick={() => setMode('SPLIT_V')} 
                icon={Rows} 
                title="Split Vertical"
             />
             <div className="w-[1px] h-6 bg-zinc-800 mx-1" />
             <ToolButton 
                active={mode === 'BLEND'} 
                onClick={() => setMode('BLEND')} 
                icon={Layers} 
                title="Blend"
             />
             <ToolButton 
                active={mode === 'FULL'} 
                onClick={() => setMode('FULL')} 
                icon={Layout} 
                title="Full View"
             />
          </div>

          {/* Center: Context Controls (Blend/Full) */}
          <div className="flex-1 flex justify-center px-4">
            {mode === 'BLEND' && (
                <div className="flex items-center gap-3 w-48">
                    <span className="text-[10px] font-bold text-zinc-500">REF</span>
                    <input 
                        type="range" min="0" max="1" step="0.01"
                        value={blendOpacity}
                        onChange={(e) => setBlendOpacity(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#c7023a]"
                        onPointerDown={(e) => e.stopPropagation()} 
                    />
                    <span className="text-[10px] font-bold text-zinc-500">RENDER</span>
                </div>
            )}
            {mode === 'FULL' && onFullViewToggle && (
                 <div className="flex bg-zinc-900 rounded-md p-0.5 border border-zinc-700">
                    <button onClick={onFullViewToggle} className={`px-3 py-1 text-[10px] font-bold rounded ${fullViewSource === 'REF' ? 'bg-[#c7023a] text-white' : 'text-zinc-500 hover:text-white'}`}>REF</button>
                    <button onClick={onFullViewToggle} className={`px-3 py-1 text-[10px] font-bold rounded ${fullViewSource === 'RENDER' ? 'bg-[#c7023a] text-white' : 'text-zinc-500 hover:text-white'}`}>RENDER</button>
                 </div>
            )}
          </div>

          {/* Right: Global Actions */}
          <div className="flex items-center gap-2">
             <button onClick={resetTransform} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Reset View">
                 <RefreshCcw size={16} />
             </button>
             <button onClick={toggleFullscreen} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Fullscreen">
                 {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
             </button>
          </div>
      </div>

      {/* --- CANVAS --- */}
      <div 
        ref={canvasRef}
        className="relative flex-1 bg-black overflow-hidden cursor-move w-full touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Zoom Indicator */}
        <div className="absolute top-4 right-4 z-30 pointer-events-none bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur">
             {Math.round(transform.scale * 100)}%
        </div>

        {/* 1. SLIDE MODE */}
        {mode === 'SLIDE' && (
            <div className="absolute inset-0 w-full h-full">
            {/* Render (Bottom) */}
            <div className={wrapperStyle}>
                <img src={renderImage} style={imgStyle} draggable={false} />
            </div>
            {/* Reference (Top - Clipped) */}
            <div className={wrapperStyle} style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                <img src={refImage} style={imgStyle} draggable={false} />
                <div className="absolute top-0 right-0 h-full border-r border-[#c7023a]/50 drop-shadow-sm"></div>
            </div>
            {/* Slider Handle */}
            <div 
                className="absolute inset-y-0 w-12 -ml-6 cursor-col-resize z-20 flex items-center justify-center group controls-layer"
                style={{ left: `${sliderPosition}%` }}
                onPointerDown={(e) => { 
                    e.stopPropagation(); 
                    (e.target as Element).setPointerCapture(e.pointerId); 
                    setIsSliding(true); 
                }}
                onPointerUp={(e) => { 
                    (e.target as Element).releasePointerCapture(e.pointerId); 
                    setIsSliding(false); 
                }}
            >
                {/* Visual Line - Minimalist */}
                <div className="absolute top-0 bottom-0 w-[1px] bg-white/30 backdrop-blur-sm group-hover:bg-[#c7023a] transition-colors"></div>
                
                {/* Minimalist Circle Handle */}
                <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-sm transform transition-all group-hover:scale-125 group-hover:bg-[#c7023a] group-hover:border-[#c7023a]"></div>
            </div>
            <Badge label="REF" position="left" />
            <Badge label="RENDER" position="right" />
            </div>
        )}

        {/* 2. SPLIT HORIZONTAL */}
        {mode === 'SPLIT_H' && (
            <div className="absolute inset-0 w-full h-full flex">
                <div className="relative w-1/2 h-full overflow-hidden border-r border-zinc-800 bg-[#080808]">
                    <div className={wrapperStyle}><img src={refImage} style={imgStyle} draggable={false} /></div>
                    <Badge label="REF" position="top-left" />
                </div>
                <div className="relative w-1/2 h-full overflow-hidden bg-[#080808]">
                    <div className={wrapperStyle}><img src={renderImage} style={imgStyle} draggable={false} /></div>
                    <Badge label="RENDER" position="top-right" />
                </div>
            </div>
        )}

        {/* 3. SPLIT VERTICAL */}
        {mode === 'SPLIT_V' && (
            <div className="absolute inset-0 w-full h-full flex flex-col">
                <div className="relative w-full h-1/2 overflow-hidden border-b border-zinc-800 bg-[#080808]">
                    <div className={wrapperStyle}><img src={refImage} style={imgStyle} draggable={false} /></div>
                    <Badge label="REF" position="top-left" />
                </div>
                <div className="relative w-full h-1/2 overflow-hidden bg-[#080808]">
                    <div className={wrapperStyle}><img src={renderImage} style={imgStyle} draggable={false} /></div>
                    <Badge label="RENDER" position="top-left" />
                </div>
            </div>
        )}

        {/* 4. BLEND MODE */}
        {mode === 'BLEND' && (
            <div className="absolute inset-0 w-full h-full">
                <div className={wrapperStyle}><img src={refImage} style={imgStyle} draggable={false} /></div>
                <div className={wrapperStyle} style={{ opacity: blendOpacity }}><img src={renderImage} style={imgStyle} draggable={false} /></div>
            </div>
        )}

        {/* 5. FULL MODE */}
        {mode === 'FULL' && (
             <div className={wrapperStyle}>
                <img src={fullViewSource === 'REF' ? refImage : renderImage} style={imgStyle} draggable={false} />
             </div>
        )}

      </div>
    </div>
  );
};

// --- Sub Components ---

const ToolButton = ({ active, onClick, icon: Icon, title }: { active: boolean, onClick: () => void, icon: any, title: string }) => (
    <button
        onClick={onClick}
        title={title}
        className={`
            flex items-center justify-center p-2 rounded-md transition-all
            ${active 
                ? 'bg-[#c7023a] text-white shadow-lg' 
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}
        `}
    >
        <Icon size={18} />
    </button>
);

const Badge = ({ label, position }: { label: string, position: string }) => {
    let posClass = "";
    if (position === 'left') posClass = "top-4 left-4";
    if (position === 'right') posClass = "top-4 right-4";
    if (position === 'top-left') posClass = "top-4 left-4";
    if (position === 'top-right') posClass = "top-4 right-4";

    return (
        <div className={`absolute ${posClass} pointer-events-none z-10`}>
            <span className="bg-black/70 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl">
                {label}
            </span>
        </div>
    );
};

export default ComparisonViewer;
