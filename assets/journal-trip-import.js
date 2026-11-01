const timeRange = /(?<!\d)(\d{1,2})\s*(?::|시)\s*(\d{2})\s*분?\s*[~～∼〜–－-]\s*(\d{1,2})\s*(?::|시)\s*(\d{2})\s*분?(?!\d)/g;
export function tripTimeRanges(text) {
  return [...String(text).matchAll(timeRange)].filter(m=>+m[1]<24&&+m[2]<60&&+m[3]<24&&+m[4]<60).map(m=>({start:m[1].padStart(2,'0')+':'+m[2],end:m[3].padStart(2,'0')+':'+m[4]}));
}
const lines = value => String(value).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
// Keep each original column in that column, even when row associations are
// ambiguous. Never use activity times or move a time into a place/purpose cell.
export function tripEntriesFromCells(time, place, purpose) {
  const times=tripTimeRanges(time), places=lines(place), purposes=lines(purpose);
  const part=(values,index)=>values.length===times.length?values[index]:index===0?values.join('\n'):'';
  return times.map((range,index)=>({id:`source-trip-${index+1}`,...range,place:part(places,index),purpose:part(purposes,index)}));
}
export function readJournalTripText(text) {
  const section=String(text).match(/출\s*장\s*내\s*역([^]*?)(?=(?:\d[.\s]*)?특\s*이\s*사\s*항|확인사항|$)/)?.[1];
  if(!section)return [];
  const values=lines(section), rows=[];
  for(let i=0;i<values.length;i++){
    if(!/^\d{1,2}$/.test(values[i]))continue;
    const row=[];
    while(i+1<values.length&&!/^\d{1,2}$/.test(values[i+1]))row.push(values[++i]);
    const body=row.filter(x=>! /^(?:순번|출장시간|출장지\s*\/\s*수요처|출장목적|결과\s*및\s*증빙)$/.test(x.replace(/\s/g,'')));
    const first=body.findIndex(x=>tripTimeRanges(x).length);
    if(first<0)continue;
    let end=first;while(end<body.length&&tripTimeRanges(body[end]).length)end++;
    const count=tripTimeRanges(body.slice(first,end).join('\n')).length;
    if(body.slice(end).some(x=>tripTimeRanges(x).length)){
      // Row-major extraction: time, place, purpose, then the next trip.
      for(let at=first;at<body.length;){let next=at+1;while(next<body.length&&!tripTimeRanges(body[next]).length)next++;const fields=body.slice(at+1,next);rows.push(...tripEntriesFromCells(body[at],fields[0]||'',fields.slice(1).join('\n')));at=next;}
    }else{
      // Column-major extraction: all times, all places, all purposes.
      const fields=body.slice(end), placeCount=fields.length>=count*2?count:Math.min(1,fields.length);
      rows.push(...tripEntriesFromCells(body.slice(first,end).join('\n'),fields.slice(0,placeCount).join('\n'),fields.slice(placeCount).join('\n')));
    }
  }
  return rows.map((row,index)=>({...row,id:`source-trip-${index+1}`}));
}

export function activityContentFromSection(value) {
  const rows=String(value).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const compact=line=>line.replace(/[\s:：]/g,'');
  let header=rows.findIndex(line=>['시간구분활동내용','시간활동내용'].includes(compact(line))), columns;
  if(header>=0)columns=compact(rows[header])==='시간활동내용'?['시간','활동내용']:['시간','구분','활동내용'];
  else {
    const content=rows.findIndex(line=>compact(line)==='활동내용');
    if(content>=2&&compact(rows[content-2])==='시간'&&compact(rows[content-1])==='구분'){header=content;columns=['시간','구분','활동내용'];}
    else if(content>=1&&compact(rows[content-1])==='시간'){header=content;columns=['시간','활동내용'];}
  }
  if(header<0)return String(value).trim();
  const body=rows.slice(header+1),column=columns.indexOf('활동내용');
  if(/\t|\s{2,}/.test(rows[header])&&body.some(line=>/\t|\s{2,}/.test(line)))return body.map(line=>line.split(/\t+|\s{2,}/).slice(column).join(' ').trim()).filter(Boolean).join('\n');
  const categories=['거점운영','거점상담','상담','홍보','모집','홍보·모집','수요처 발굴','발굴','연계·배치','연계','관리','실적관리','운영','프로그램 운영','회의·교육','교육','출장','기타','프로그램운영'];
  const output=[];let categoryDue=false;
  for(const line of body){
    const times=tripTimeRanges(line);
    const remaining=line.replace(timeRange,'').replace(/[\s,，~～∼〜–－-]/g,'');
    if(times.length&&!remaining){categoryDue=columns.includes('구분');continue;}
    if(categoryDue&&categories.some(label=>compact(label)===compact(line).replace(/[,，;；]$/,''))){categoryDue=false;continue;}
    categoryDue=false;
    // Two-column rows may keep the time and content on the same text line.
    output.push(columns.length===2&&times.length?line.replace(timeRange,'').trim():line);
  }
  return output.filter(Boolean).join('\n').trim();
}
