import {unzipSync,zipSync,strFromU8,strToU8} from './photo-hwpx/zip.mjs';

const all = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
const first = (node, name) => all(node, name)[0];
const xml = text => new DOMParser().parseFromString(text, 'application/xml');
const serialize = doc => strToU8(new XMLSerializer().serializeToString(doc));

function pictureNode(doc, slot, width, height) {
  const ns = doc.documentElement.lookupNamespaceURI('hp');
  const core = doc.documentElement.lookupNamespaceURI('hc');
  const markup = `<hp:pic xmlns:hp="${ns}" xmlns:hc="${core}" id="${100000+slot}" instid="${100000+slot}" zOrder="${slot}" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" groupLevel="0" reverse="0"><hp:offset x="0" y="0"/><hp:orgSz width="${width}" height="${height}"/><hp:curSz width="${width}" height="${height}"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${Math.floor(width/2)}" centerY="${Math.floor(height/2)}" rotateimage="0"/><hp:renderingInfo>${['transMatrix','scaMatrix','rotMatrix'].map(tag=>`<hc:${tag} e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>`).join('')}</hp:renderingInfo><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${width}" y="0"/><hc:pt2 x="${width}" y="${height}"/><hc:pt3 x="0" y="${height}"/></hp:imgRect><hp:imgClip left="0" right="${width}" top="0" bottom="${height}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${width}" dimheight="${height}"/><hc:img binaryItemIDRef="photo${slot}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:effects/><hp:sz width="${width}" height="${height}" widthRelTo="ABSOLUTE" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" flowWithText="1" affectLSpacing="0" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/></hp:pic>`;
  return doc.importNode(xml(markup).documentElement,true);
}

export async function saveHangul({photos,count,activity,date}) {
  const response = await fetch(new URL(`./photo-hwpx/form-${count}.hwpx`,import.meta.url));
  if (!response.ok) throw Error('양식을 열 수 없어요.');
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const sectionKey='Contents/section0.xml', packageKey='Contents/content.hpf';
  const section=xml(strFromU8(files[sectionKey])), pkg=xml(strFromU8(files[packageKey]));
  const details=all(section,'t').find(t=>t.textContent==='{{details}}');
  details.textContent=(count===3?'● 봉사내용: ':'')+activity+'        ● 일 시: '+date;
  const rows=all(section,'tr');
  for(let i=0;i<count;i++){
    if(!photos[i]) continue;
    const row=rows[2+2*(count===3?i:Math.floor(i/2))];
    const cell=all(row,'tc')[count===3||i%2===0?1:3];
    const image=new Image();
    image.src=photos[i].url;
    await image.decode();
    const canvas=document.createElement('canvas');
    const qualityScale=Math.min(1,2200/Math.max(image.naturalWidth,image.naturalHeight));
    canvas.width=Math.max(1,Math.round(image.naturalWidth*qualityScale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*qualityScale));
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
    const filename=`BinData/photo${i}.jpg`;
    files[filename]=new Uint8Array(await blob.arrayBuffer());
    const manifest=first(pkg,'manifest'), item=pkg.createElementNS(manifest.namespaceURI,'opf:item');
    for(const [key,value] of Object.entries({id:'photo'+i,href:filename,'media-type':'image/jpeg',isEmbeded:'1'}))item.setAttribute(key,value);
    manifest.appendChild(item);
    const size=first(cell,'cellSz'), margin=first(cell,'cellMargin');
    const inset=k=>Number(margin?.getAttribute(k)||0);
    const scale=Math.min((size.getAttribute('width')-inset('left')-inset('right')-300)/canvas.width,(size.getAttribute('height')-inset('top')-inset('bottom')-400)/canvas.height);
    const run=first(cell,'run');
    run.appendChild(pictureNode(section,i,Math.floor(canvas.width*scale),Math.floor(canvas.height*scale)));
  }
  files[sectionKey]=serialize(section);files[packageKey]=serialize(pkg);
  const blob=new Blob([zipSync({...files,mimetype:[files.mimetype,{level:0}]})],{type:'application/haansofthwpx'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='활동보고서사진.hwpx';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
