export const STEP2_MESSAGES={
 start:'지진이 발생했습니다. 안전한 장소로 대피하세요.',
 correct:'올바른 행동입니다. 흔들림이 멈출 때까지 책상 아래에서 머리와 몸을 보호하세요.',
 door:'위험한 행동입니다. 지진으로 흔들리는 동안 밖으로 뛰어나가면 낙하물이나 깨진 유리 등에 다칠 수 있습니다.',
 locker:'위험한 행동입니다. 지진이 발생하면 사물함이나 높은 가구가 넘어질 수 있으므로 가까이에서 몸을 지탱하면 안 됩니다.',
 timeout:'흔들림이 계속되는 동안 머리와 몸을 보호하지 못했습니다. 안전한 대피 방법을 다시 선택해 보세요.'
};
export class ShelterState {
 constructor(onEvent=()=>{}){this.onEvent=onEvent;this.reset();}
 reset(){this.phase='idle';this.remaining=15;this.hold=0;this.shelteredTime=0;this.lost=0;this.lockerTime=0;this.reason=null;this.deskId=null;this.result=null;}
 start(){this.reset();this.phase='choosing';this.onEvent('start');}
 fail(reason){if(['idle','failed','ready'].includes(this.phase))return;this.phase='failed';this.reason=reason;this.onEvent(reason);}
 update(dt,s){if(['idle','failed','ready'].includes(this.phase))return;dt=Math.max(0,dt);
  if(s.exiting){this.fail('door');return;}
  this.lockerTime=s.lockerStill?this.lockerTime+dt:0;
  if(s.leaning||this.lockerTime>=2.5){this.fail('locker');return;}
  const safe=!!(s.under&&s.low&&(s.gripping||s.twoArmProtection)&&s.protecting);
  if(this.phase==='choosing'){
   this.remaining=Math.max(0,this.remaining-dt);this.hold=safe&&(!this.deskId||this.deskId===s.deskId)?this.hold+dt:0;this.deskId=s.under?s.deskId:null;
   // Completing the posture on the deadline wins over timeout.
   if(this.hold>=1.5){this.phase='sheltered';this.shelteredTime=0;this.lost=0;this.onEvent('correct');}
   else if(this.remaining<=0&&!safe)this.fail('timeout');
  }else{
   this.lost=safe&&s.deskId===this.deskId?0:this.lost+dt;
   if(this.lost>.65){this.phase='choosing';this.hold=0;this.shelteredTime=0;this.lost=0;this.onEvent('posture-lost');return;}
   if(safe)this.shelteredTime+=dt;
   if(this.shelteredTime>=6)this.phase='settling';
   if(this.shelteredTime>=9){this.phase='ready';this.result={version:1,completedStep:2,nextStep:3,status:'ready',action:'desk-shelter',deskId:this.deskId,protectedSeconds:this.shelteredTime};this.onEvent('complete');}
  }
 }
 get intensity(){return this.phase==='ready'?0:this.phase==='settling'?Math.max(0,1-(this.shelteredTime-6)/3):1;}
 get message(){if(this.phase==='failed')return STEP2_MESSAGES[this.reason];if(this.phase==='ready')return '흔들림이 멈췄습니다. 다음 안내를 기다리세요.';if(['sheltered','settling'].includes(this.phase))return this.shelteredTime<3?STEP2_MESSAGES.correct:'흔들림이 멈출 때까지 보호 자세를 유지하세요.';return STEP2_MESSAGES.start;}
}
