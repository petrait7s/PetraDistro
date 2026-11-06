#!/usr/bin/env python3
"""Generate v0.2 with original v0.1 method inputs preserved at desktop boundary."""
import runpy,pathlib,json,shutil
ns=runpy.run_path(str(pathlib.Path(__file__).with_name('gen_contract_v02.py')))
c=ns['C'];r=c/'runtime-0.2';r.mkdir(exist_ok=True)
for name in ['methods.json','types.json','errors.json','settings.json','events.json','approval-matrix.json']:shutil.copyfile(c/name,r/name)
obj=json.loads((c/'methods.json').read_text());old=json.loads((c/'legacy-0.1.0/methods.json').read_text());legacy={m['name']:m for m in old['methods']}
for m in obj['methods']:
 if m['name'] in legacy:
  m['input']=legacy[m['name']]['input'];m['input_schema']=ns['schema'](m['input'])
  if m['name']=='files.saveBytes':m['input_schema']['properties']['bytes_b64']['maxLength']=28000000
# The requested open_items addition is the only intentional legacy ledger shape addition.
for m in obj['methods']:
 if m['name']=='customers.ledger':
  m['output']['open_items']='[{sale_id:id?,opening:bool,ref:string,date:date,left:money}]';m['output_schema']=ns['schema'](m['output'])
(c/'methods.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
(c/'METHODS.md').write_text('# Desktop contract v0.2.0\n\nOriginal 104 method input keys remain v0.1.0-compatible. Additional methods are listed below. Unsafe legacy flows explicitly return UNSUPPORTED; see KNOWN_GAPS.md.\n\n| Method | Role | Input |\n|---|---|---|\n'+''.join('| '+m['name']+' | '+m['who']+' | `'+json.dumps(m['input'],ensure_ascii=False).replace('|','/')+'` |\n' for m in obj['methods']))
