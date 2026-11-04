#!/usr/bin/env python3
"""Static docs validation, not runtime/API/DB/Android verification."""
from pathlib import Path
import re,sys,yaml
root=Path(__file__).resolve().parent.parent
must=['AGENTS.md','docs/features/AGENTS.md','docs/api/AGENTS.md','docs/database/AGENTS.md','docs/ui/AGENTS.md','apps/mobile/AGENTS.md','apps/cheonhajangsa/AGENTS.md','packages/vendor-contracts/AGENTS.md','supabase/AGENTS.md','docs/api/openapi.yaml','docs/reviews/CONFLICTS.md']
issues=[]
for path in must:
 if not (root/path).is_file():issues.append('missing required: '+path)
api=yaml.safe_load((root/'docs/api/openapi.yaml').read_text(encoding='utf-8'))
if api.get('openapi')!='3.1.0':issues.append('unexpected OpenAPI version')
ops=[]
for endpoint,item in api.get('paths',{}).items():
 for method,value in item.items():
  if method.lower() not in ('get','post','put','patch','delete'):continue
  ops.append((method.upper(),endpoint))
  doc=value.get('x-spec-doc')
  if not doc or not (root/doc).is_file():issues.append('missing endpoint doc for '+endpoint+' '+method)
  if 'x-implementation-status' not in value:issues.append('missing implementation status for '+endpoint)
# Check local Markdown links only; remote and anchors are not local file paths.
links=0
for p in root.rglob('*.md'):
 s=p.read_text(encoding='utf-8')
 for link in re.findall(r'(?<!!)\[[^]]+\]\(([^)]+)\)',s):
  if link.startswith(('http:','https:','#','mailto:')):continue
  dest=link.split('#',1)[0].strip().split(' ',1)[0]
  if not dest:continue
  links+=1
  if not (p.parent/dest).exists():issues.append('broken link '+str(p.relative_to(root))+' -> '+dest)
print('Markdown files',len(list(root.rglob('*.md'))),'AGENTS',len(list(root.rglob('AGENTS.md'))),'API operations',len(ops),'links checked',links)
if issues:
 print('FAIL:',len(issues));print('\n'.join(issues[:80]));sys.exit(1)
print('PASS: static document structure checks only; deployment, Zod, DB and Android NOT TESTED')
