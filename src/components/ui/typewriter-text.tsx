import {useEffect, useState, type ReactNode} from 'react';
import {useReducedMotion} from 'framer-motion';
import {cn} from '@/lib/utils';

interface TypewriterProps {
  text: string | string[];
  speed?: number;
  deleteSpeed?: number;
  delay?: number;
  loop?: boolean;
  repeatDelay?: number;
  className?: string;
  renderText?: (visibleText: string) => ReactNode;
  placeholder?: ReactNode;
}

/** Character-by-character typing with an optional delete/retype cycle. */
export function Typewriter({text, speed=100, deleteSpeed=speed/2, delay=0, loop=false, repeatDelay=1800, className, renderText, placeholder}:TypewriterProps) {
  const reduced=useReducedMotion();
  const [frame,setFrame]=useState({index:0,count:0,deleting:false});
  const textKey=JSON.stringify(Array.isArray(text)?text:[text]);
  const entries: string[]=JSON.parse(textKey);
  const current=entries[frame.index] ?? '';
  const characters=Array.from(current);
  useEffect(()=>{setFrame({index:0,count:0,deleting:false})},[textKey]);
  useEffect(()=>{
    if(reduced || !entries.length) return;
    const complete=frame.count>=characters.length;
    if(complete && !loop) return;
    const timeout=frame.deleting ? Math.max(25,deleteSpeed) : complete ? repeatDelay : frame.count===0 ? delay+speed : speed;
    const timer=setTimeout(()=>setFrame(previous=>{
      if(previous.deleting) {
        if(previous.count===0)return {index:(previous.index+1)%entries.length,count:0,deleting:false};
        return {...previous,count:previous.count-1};
      }
      if(previous.count>=characters.length)return {...previous,deleting:true};
      return {...previous,count:previous.count+1};
    }),timeout);
    return ()=>clearTimeout(timer);
  },[frame,characters.length,entries.length,speed,deleteSpeed,delay,loop,repeatDelay,reduced,textKey]);
  const visible=reduced?current:characters.slice(0,frame.count).join('');
  const render=(value:string)=>renderText?renderText(value):value;
  return <span className={cn('typewriter',className)}>
    <span className="sr-only">{current}</span>
    <span aria-hidden="true" className="typewriter-layout">{placeholder ?? render(current)}</span>
    <span aria-hidden="true" className="typewriter-content">{render(visible)}{!reduced&&<span className="typewriter-cursor">|</span>}</span>
  </span>;
}
