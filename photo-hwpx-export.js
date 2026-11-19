import init, {HwpDocument} from './photo-hwpx/rhwp.js';
let ready;
export async function saveHangul({photos, count, activity, date}) {
  ready ||= init({module_or_path:new URL('./photo-hwpx/rhwp_bg.wasm',import.meta.url)});
  await ready;
  const scale=4, width=174, height=256;
  const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;
  const c=canvas.getContext('2d');c.scale(scale,scale);c.fillStyle='#fff';c.fillRect(0,0,width,height);c.fillStyle='#111';
  c.textAlign='center';c.textBaseline='middle';c.font='bold 7.4px "함초롱바탕", "함초롬바탕", Batang, serif';c.fillText('자원봉사 활동사진',87,6.5);const titleWidth=c.measureText('자원봉사 활동사진').width;c.fillRect(87-titleWidth/2,11,titleWidth,.25);
  const frameY=15.5, frameHeight=count===3?240:14+12+Math.ceil(count/2)*41+(Math.ceil(count/2)-1)*5;
  c.strokeStyle='#111';c.lineWidth=.55;c.strokeRect(.3,frameY,width-.6,frameHeight);c.lineWidth=.25;c.beginPath();c.moveTo(0,frameY+14);c.lineTo(width,frameY+14);c.stroke();
  c.textAlign='left';c.font='bold 4.23px "나눔고딕", "Malgun Gothic", sans-serif';c.fillText('● 봉사내용:',4,frameY+7);c.font='4.23px "나눔고딕", "Malgun Gothic", sans-serif';c.save();c.beginPath();c.rect(30,frameY,70,14);c.clip();c.fillText(activity,31,frameY+7);c.restore();c.font='bold 4.23px "나눔고딕", "Malgun Gothic", sans-serif';c.fillText('● 일 시:',104,frameY+7);c.font='4.23px "나눔고딕", "Malgun Gothic", sans-serif';c.fillText(date,125,frameY+7);
  for(let i=0;i<count;i++){
    const x=count===3?(width-127)/2:10+(i%2)*82,y=frameY+14+(count===3?7+i*71:6+Math.floor(i/2)*46),w=count===3?127:72,h=count===3?64:41;
    c.strokeStyle='#333';c.lineWidth=.25;c.strokeRect(x,y,w,h);
    if(photos[i]){const img=new Image();img.src=photos[i].url;await img.decode();const ratio=Math.min((w-.5)/img.naturalWidth,(h-.5)/img.naturalHeight);const iw=img.naturalWidth*ratio,ih=img.naturalHeight*ratio;c.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih)}
  }
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('사진을 만들지 못했습니다.')),'image/png'));
  const doc=HwpDocument.createEmpty();try{doc.createBlankDocument();const def=JSON.parse(doc.getPageDef(0));Object.assign(def,{marginLeft:5102,marginRight:5102,marginTop:5669,marginBottom:4252,marginHeader:0,marginFooter:0});doc.setPageDef(0,JSON.stringify(def));doc.insertPicture(0,0,0,'',new Uint8Array(await blob.arrayBuffer()),49322,Math.round(height*7200/25.4),canvas.width,canvas.height,'png','활동보고서 사진');const bytes=doc.exportHwpx();const result=new Blob([bytes],{type:'application/haansofthwpx'});const url=URL.createObjectURL(result),a=document.createElement('a');a.href=url;a.download='활동보고서사진.hwpx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}finally{doc.free()}
}
