import {tripTimeRanges,tripEntriesFromCells} from './journal-trip-import.js?v=20261101-trip-columns-v1';
const compact = value => value.replace(/\s/g, '');
const range = /(?<!\d)(\d{1,2})\s*(?::|시)\s*(\d{2})\s*분?\s*[~～∼〜–－-]\s*(\d{1,2})\s*(?::|시)\s*(\d{2})\s*분?(?!\d)/g;
const center = item => item.x + item.width / 2;

function lines(items) {
  const rows = [];
  for (const item of [...items].sort((a,b) => b.y-a.y || a.x-b.x)) {
    let row = rows.find(row => Math.abs(row.y-item.y) <= 3);
    if (!row) rows.push(row = { y:item.y, items:[] });
    row.items.push(item);
  }
  return rows.sort((a,b)=>b.y-a.y).map(row=>row.items.sort((a,b)=>a.x-b.x).map(item=>item.str).join(' ').trim()).filter(Boolean).join('\n');
}

// A conservative path for the numbered journal table. Other layouts retain OCR.
export function readPdfJournalLayout(rawItems) {
  const items = rawItems.filter(item => item.str?.trim() && item.transform?.length >= 6).map(item => ({str:item.str.trim(),x:item.transform[4],y:item.transform[5],width:item.width||0,height:item.height||10,font:item.fontName}));
  const headings = ['기본현황','활동시간및유형','세부활동내용','활동실적','출장내역','특이사항','확인'].map((title,index)=>items.find(item=>new RegExp(`^${index+1}[.)]${title}`).test(compact(item.str))));
  if (headings.some(item=>!item)) return null;
  const section = index => items.filter(item => item.y < headings[index].y-3 && item.y > (headings[index+1]?.y ?? 0)+3);
  const basic = section(0), activity = section(1), detail = section(2), countsArea = section(3), tripArea = section(4), notesArea = section(5);
  const labels = ['거점캠프명','활동가성명','활동일자','활동장소'];
  const field = label => {
    const anchor=basic.find(item=>compact(item.str)===label);
    if (!anchor) return '';
    const next=basic.filter(item=>labels.includes(compact(item.str)) && item.x>anchor.x && Math.abs(item.y-anchor.y)<4).sort((a,b)=>a.x-b.x)[0];
    const otherRows=basic.filter(item=>labels.includes(compact(item.str))&&Math.abs(item.y-anchor.y)>=4).map(item=>Math.abs(item.y-anchor.y));
    const halfRow=otherRows.length?Math.min(...otherRows)/2:10;
    return lines(basic.filter(item=>Math.abs(item.y-anchor.y)<halfRow && item.x>=anchor.x+anchor.width-1 && item.x<(next?.x??Infinity)-2));
  };
  const camp=field('거점캠프명'),name=field('활동가성명'),dateText=field('활동일자'),place=field('활동장소');
  const timeLabel=activity.find(item=>compact(item.str)==='활동시간'),totalLabel=activity.find(item=>compact(item.str)==='총활동시간');
  const detailTime=detail.find(item=>compact(item.str)==='시간'),categoryLabel=detail.find(item=>compact(item.str)==='구분'),contentLabel=detail.find(item=>compact(item.str)==='활동내용');
  if (!camp || !name || !dateText || !timeLabel || !totalLabel || !detailTime || !categoryLabel || !contentLabel) return null;
  const timeText=lines(activity.filter(item=>item.x>=timeLabel.x+timeLabel.width-1 && item.x<totalLabel.x-2 && Math.abs(item.y-timeLabel.y)<22));
  const timeRanges=[...timeText.matchAll(range)].map(match=>({start:`${match[1].padStart(2,'0')}:${match[2]}`,end:`${match[3].padStart(2,'0')}:${match[4]}`}));
  if (!timeRanges.length) return null;
  const totalText=lines(activity.filter(item=>item.x>=totalLabel.x+totalLabel.width-1 && Math.abs(item.y-totalLabel.y)<16));
  const total=totalText.match(/(\d+)\s*시간(?:\s*(\d+)\s*분)?/),totalMinutes=total?Number(total[1])*60+Number(total[2]||0):null;
  const contentLeft=center(categoryLabel)+(center(categoryLabel)-center(detailTime))/2;
  const body=detail.filter(item=>item.y<Math.min(contentLabel.y,categoryLabel.y,detailTime.y)-5);
  const details=lines(body.filter(item=>item.x>=contentLeft));
  const categoryLeft=(center(categoryLabel)+center(detailTime))/2;
  const category=lines(body.filter(item=>item.x>=categoryLeft && item.x<contentLeft));
  const types=[];
  for (const label of ['거점상담','홍보·모집','수요처 발굴','연계·배치','실적관리','프로그램 운영','회의·교육','출장','기타']) {
    const anchor=activity.find(item=>compact(item.str).startsWith(compact(label)));
    if (!anchor) continue;
    const marks=activity.filter(item=>item.x<anchor.x && anchor.x-item.x<25 && Math.abs(item.y-anchor.y)<7).map(item=>item.str);
    const checked=marks.some(mark=>/^[☑☒✓✔√▣■🗹]$/.test(mark) || mark==='b' || mark==='gfedcb');
    const explicit=checked || marks.some(mark=>/^[gfedc]$/.test(mark)||mark==='gfedc'||/^[□☐]$/.test(mark));
    const tail=label==='기타'?lines(activity.filter(item=>item.x>=anchor.x+anchor.width-1&&Math.abs(item.y-anchor.y)<4)):'';
    types.push(`${explicit?(checked?'☑ ':'□ '):''}${anchor.str}${tail?` ${tail}`:''}`);
  }
  const countLabels=[['상담인원','상담 인원'],['신규봉사자','신규 봉사자 등록인원'],['홍보·모집','홍보·모집'],['수요처발굴·확인','수요처 발굴·확인'],['봉사자연계·배치','봉사자 연계·배치'],['실적입력·정리','실적 입력·정리'],['프로그램운영','프로그램 운영'],['기타','기타']];
  const anchors=countLabels.map(([key,label])=>({label,item:countsArea.find(item=>compact(item.str)===key)})).filter(row=>row.item);
  const counts={};
  for (const {label,item} of anchors) {
    const wrapped=label==='신규 봉사자 등록인원'?countsArea.find(part=>compact(part.str)==='등록인원'&&Math.abs(part.x-item.x)<30&&Math.abs(part.y-item.y)<18):null;
    const y=wrapped?(item.y+wrapped.y)/2:item.y;
    const next=anchors.filter(row=>row.item.x>item.x+item.width&&Math.abs(row.item.y-y)<12).sort((a,b)=>a.item.x-b.item.x)[0];
    const value=lines(countsArea.filter(part=>part.x>=item.x+item.width-1&&part.x<(next?.item.x??Infinity)-2&&Math.abs(part.y-y)<8));
    const unit = suffix => value.match(new RegExp(`(\\d+)\\s*${suffix}`))?.[1];
    if (label==='홍보·모집'||label==='봉사자 연계·배치') { const who=unit('명'),cases=unit('건'); if(who)counts[label==='홍보·모집'?'홍보·모집 인원':'봉사자 연계·배치 인원']=who;if(cases)counts[label==='홍보·모집'?'홍보·모집 건수':'봉사자 연계·배치 건수']=cases; }
    else if(label==='프로그램 운영'){if(unit('회'))counts['프로그램 운영 횟수']=unit('회');if(unit('명'))counts['프로그램 운영 인원']=unit('명');}
    else {const number=value.match(/\d+/)?.[0];if(number)counts[label]=number;}
  }
  const tripHeaders=['순번','출장시간','출장지/수요처','출장목적','결과및증빙'].map(label=>tripArea.find(item=>compact(item.str)===label));
  const trips=[];
  if(tripHeaders.every(Boolean)){
    const centers=tripHeaders.map(center),indices=tripArea.filter(item=>/^\d+$/.test(item.str)&&Math.abs(center(item)-centers[0])<18&&item.y<tripHeaders[0].y-5).sort((a,b)=>b.y-a.y);
    for(let index=0;index<indices.length;index++){
      const current=indices[index],top=index?(indices[index-1].y+current.y)/2:tripHeaders[0].y-5,bottom=index<indices.length-1?(current.y+indices[index+1].y)/2:headings[5].y+3;
      const row=tripArea.filter(item=>item.y<top&&item.y>bottom),cells=centers.map((x,column)=>lines(row.filter(item=>item.x>=(column?centers[column-1]+(column===1?(x-centers[column-1])/2:(centers[column-1]-centers[column-2])/2):-Infinity)&&item.x<(column<centers.length-1?x+(column?x-centers[column-1]:centers[1]-x)/2:Infinity))));
      const times=row.filter(item=>item.x>=centers[0]+(centers[1]-centers[0])/2&&item.x<centers[1]+(centers[1]-centers[0])/2).flatMap(item=>tripTimeRanges(item.str).map(time=>({...time,y:item.y}))).sort((a,b)=>b.y-a.y);
      if(times.length>1&&new Set(times.map(time=>time.y)).size===times.length){
        for(let number=0;number<times.length;number++){
          const time=times[number],above=number?(times[number-1].y+time.y)/2:top,below=number<times.length-1?(time.y+times[number+1].y)/2:bottom;
          const value=column=>lines(row.filter(item=>item.y<=above&&item.y>below&&item.x>=centers[column-1]+(centers[column-1]-centers[column-2])/2&&item.x<centers[column]+(centers[column]-centers[column-1])/2));
          trips.push({id:`source-trip-${trips.length+1}`,start:time.start,end:time.end,place:value(2),purpose:value(3)});
        }
      }else for(const trip of tripEntriesFromCells(cells[1],cells[2],cells[3]))trips.push({...trip,id:`source-trip-${trips.length+1}`});
    }
  }
  const notes=lines(notesArea.filter(item=>!/^특이사항\s*\/\s*건의사항$/.test(item.str)&&!/^\s*[•·]\s*$/.test(item.str)));
  const text=[`거점캠프명: ${camp}`,`활동가 성명: ${name}`,`활동일자: ${dateText}`,`활동장소: ${place}`,'활동시간',timeText,'총 활동시간',totalText,'활동유형',...types,'세부활동내용',details,'활동실적','출장내역','특이사항',notes,'확인',lines(section(6))].join('\n');
  const typeOther=types.find(value=>value.startsWith('☑ 기타'))?.match(/[（(]([\s\S]*?)[）)]/)?.[1]?.trim()||'';
  return {text,name,camp,category,counts,trips,typeOther,fields:{...timeRanges[0],timeRanges,breakMinutes:0,totalMinutes,details,place,notes,conflict:false}};
}
