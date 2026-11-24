export class EvacuationState {
 constructor(){this.reset();}
 reset(){this.phase='idle';this.collected=false;this.protected=false;this.result=null;}
 start(){this.phase='classroom';this.collected=false;this.protected=false;}
 update({protected:protectedNow,exitDoor}){if(this.phase==='idle')return false;this.protected=this.collected&&!!protectedNow;if(this.phase!=='classroom')return false;if(exitDoor===null||exitDoor===undefined)return false;this.phase='corridor';this.result={version:1,completedStep:3,currentStep:4,status:'entered-corridor',doorId:exitDoor,bagCollected:this.collected,bagProtected:this.protected};return true;}
}
export function crossedDoor(previous,p,doors){return doors.find(d=>d.source.progress>.1&&previous.x>d.plane-.24&&p.x<=d.plane-.24&&p.x<previous.x&&p.z>d.z0+.08&&p.z<d.z1-.08&&Math.abs(p.y-4.4)<.2)?.source.id??null;}
