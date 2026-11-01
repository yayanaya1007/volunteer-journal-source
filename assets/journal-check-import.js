// Read the stored checkbox state, rather than guessing it from activity prose.
export const activityTypeLabels = ['거점상담','홍보·모집','수요처 발굴','연계·배치','실적관리','프로그램 운영','회의·교육','출장','기타'];
export function checkedActivityTypes(text) {
  const normalized = text.replace(/[\u00fe\uf0fe]/g,'☑');
  const section = normalized.match(/활\s*동\s*유\s*형([\s\S]*?)(?=(?:\d+[.)]\s*)?세\s*부\s*활\s*동\s*내\s*용|활\s*동\s*실\s*적|$)/)?.[1] || '';
  return activityTypeLabels.filter(label => {
    const pattern = label.replace(/\s/g,'').split('').map(ch => /[·ㆍ・.／/]/.test(ch) ? '[·ㆍ・.／/\\s]*' : ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
    return new RegExp('(?:☑|☒|✓|✔|√|▣|■|🗹)\\s*'+pattern+'(?![가-힣])').test(section);
  });
}

// HWP 5 paragraph text holds eight-word control placeholders. FORM_OBJECT
// records contain the actual checkbox caption and Value, outside that text.
export function hwpParagraphText(bytes) {
  const u16 = p => bytes[p] | bytes[p+1]<<8;
  const u32 = p => (u16(p) | u16(p+2)<<16)>>>0;
  const output=[], pending=[];
  for(let p=0;p+4<=bytes.length;) {
    const head=u32(p);p+=4;let size=head>>>20;
    if(size===4095){if(p+4>bytes.length)break;size=u32(p);p+=4;}
    if(size>bytes.length-p)break;
    const end=p+size,tag=head&1023;
    if(tag===67) {
      while(p+1<end) {
        const code=u16(p);p+=2;
        const extended=(code>=1&&code<=9)||[11,12,14,15,16,17,18,19,20,21,22,23].includes(code);
        if(extended) {
          if(code===9)output.push('\t');
          if(code===11&&p+14<=end&&u32(p)===0x666f726d){pending.push(output.length);output.push('');}
          p=Math.min(end,p+14);
        } else if(code===10||code===13)output.push('\n');
        else if(code>=32)output.push(String.fromCharCode(code));
      }
    } else if(tag===91) {
      const index=pending.shift();
      if(index!==undefined&&size>=4&&u32(p)===0x2b636274) {
        const properties=new TextDecoder('utf-16le').decode(bytes.subarray(p,end));
        const caption=properties.match(/Caption:wstring:(\d+):/);
        if(caption){const start=caption.index+caption[0].length,label=properties.slice(start,start+Number(caption[1])),value=properties.slice(start+Number(caption[1])).match(/^\s+Value:int:([012])\b/);if(value)output[index]=(value[1]==='1'?'☑ ':'□ ')+label;}
      }
    }
    p=end;
  }
  return output.join('');
}

export function hwpxCheckboxText(xml) {
  return xml.replace(/<hp:checkBtn\b([^>]*?)(?:\/\s*>|>[\s\S]*?<\/hp:checkBtn\s*>)/g,(_,attributes)=>{
    const attr=name=>attributes.match(new RegExp('\\b'+name+'=["\x27]([^"\x27]*)["\x27]'))?.[1]||'';
    const caption=attr('caption'),value=attr('value');
    return (value==='CHECKED'||value==='1'?'☑ ':'□ ')+caption+' ';
  });
}

export function checkedActivityOther(text) {
  if(!checkedActivityTypes(text).includes('기타'))return '';
  const section=text.match(/활\s*동\s*유\s*형([\s\S]*?)(?=세\s*부\s*활\s*동\s*내\s*용|$)/)?.[1]||'';
  return section.match(/기\s*타\s*[（(]([^）)]*)[）)]/)?.[1]?.trim()||'';
}
