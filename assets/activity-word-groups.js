// Only user-provided combinations are inferred. Unmatched words stay visible.
const key = value => String(value).replace(/\s+/g, '').replace(/^안부묻기$/, '안부').replace(/^만들기$/, '만들어');
const recipes = [
  ['어르신 안부', [['어르신','안부']], '거점상담', '상담'],
  ['어르신 말벗', [['어르신','말벗']], '거점상담', '상담'],
  ['취약계층 어르신', [['취약계층','어르신']]],
  ['도로변 잡초제거', [['도로변','잡초제거']]],
  ['도로변 나무심기', [['도로변','나무심기']]],
  ['우리동네 환경정화', [['우리동네','환경정화']]],
  ['도로변 꽃밭가꾸기', [['도로변','꽃밭가꾸기']]],
  ['실적관리 1365 입력', [['실적관리','1365입력']], '실적관리', '관리'],
  ['거점 프로그램진행', [['거점','프로그램진행']], '프로그램 운영', '운영'],
  ['면사무소 차봉사', [['면사무소','차봉사']]],
  ['불고기 나눔', [['불고기','나눔']]],
  ['장조림 나눔', [['장조림','나눔']]],
  ['김장김치 나눔', [['김장김치','나눔']]],
  ['불고기 밑반찬 만들기', [['불고기','밑반찬만들기'],['불고기','밑반찬','만들어']]],
  ['장조림 밑반찬 만들기', [['장조림','밑반찬만들기'],['장조림','밑반찬','만들어']]],
  ['밑반찬 나눔', [['밑반찬','나눔']]],
  ['밑반찬 배달봉사', [['밑반찬','배달봉사']]],
  ['밑반찬 만들어 나눔', [['밑반찬만들기','나눔'],['밑반찬','만들어','나눔']]],
  ['밑반찬 만들어 배달봉사', [['밑반찬만들기','배달봉사'],['밑반찬','만들어','배달봉사']]],
  ['취약계층 밑반찬 나눔', [['취약계층','밑반찬','나눔']]],
  ['취약계층 밑반찬 만들어 나눔', [['취약계층','밑반찬만들기','나눔'],['취약계층','밑반찬','만들어','나눔']]],
  ['불고기 만들어 나눔', [['불고기','만들어','나눔'],['불고기','밑반찬만들기','나눔'],['불고기','밑반찬','만들어','나눔']]],
  ['무연고 묘 벌초', [['무연고묘','벌초']]],
  ['취약계층 생필품 지원', [['취약계층','생필품지원']]],
  ['취약계층 대상자 발굴', [['취약계층','대상자','발굴']], '기타', '발굴'],
  ['거점 봉사자관리', [['거점','봉사자관리']], '실적관리', '관리']
];
export const ACTIVITY_COMBINATIONS = recipes.map(([label, patterns]) => ({label, patterns}));
export function activityGroupsForSelection(selected = []) {
  const words = [...new Set(selected)], available = new Set(words.map(key));
  const candidates = recipes.flatMap(([label, patterns, type = '기타', category = '기타']) => {
    const matching = patterns.map(pattern => pattern.map(key)).filter(pattern => pattern.every(word => available.has(word)));
    if (!matching.length) return [];
    const used = new Set(matching.flat());
    return [{ id: `phrase:${label}`, label, tokens: words.filter(word => used.has(key(word))), keys: used, types: [type], category }];
  });
  // Prefer the complete phrase over its shorter duplicate, but allow a shared
  // modifier in distinct supported activities (e.g. two different roadside jobs).
  const groups = candidates.filter(group => !candidates.some(other => other !== group && other.keys.size > group.keys.size && [...group.keys].every(word => other.keys.has(word))));
  const used = new Set(groups.flatMap(group => group.tokens));
  groups.push(...words.filter(word => !used.has(word)).map(word => ({ id: word, label: word, tokens: [word] })));
  groups.sort((a, b) => Math.min(...a.tokens.map(word => words.indexOf(word))) - Math.min(...b.tokens.map(word => words.indexOf(word))));
  return groups.map(({keys, ...group}) => group);
}
export function activityPhraseText(selected = []) {
  return activityGroupsForSelection(selected).map(group => group.label).join('·');
}
