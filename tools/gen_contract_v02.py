#!/usr/bin/env python3
"""Deterministic contract compiler. Legacy inputs are frozen; changes live here."""
import json,re,pathlib,copy
ROOT=pathlib.Path(__file__).resolve().parents[1]; C=ROOT/'contract'; MAX=9007199254740991
old=json.loads((C/'legacy-0.1.0/methods.json').read_text()); types=json.loads((C/'legacy-0.1.0/types.json').read_text()); methods=old['methods']; by={m['name']:m for m in methods}
def change(n,**kw): by[n].update(kw)
def inp(n,**kw): by[n]['input'].update(kw)
def add(n,who,inputs,output,summary,mutates=False):
 m=dict(name=n,who=who,input=inputs,output=output,summary=summary,errors=[],mutates=mutates); methods.append(m);by[n]=m
# Contract corrections, not prototype arithmetic.
by['auth.login']['output']['session']={'lock_after_sec':'int','locked':'bool'}
by['auth.login']['output']['settings_public']='SettingsPublic'
change('auth.requestApproval',input={'owner_pin':'string','operation':'string','payload':'json'})
by['auth.requestApproval']['output']={'token':'string','expires_at':'ts','operation':'string'}
change('editmode.enable',input={'approval':'Approval'})
change('license.reveal',output={'code':'string'})
for n in ['purchases.cancel','stock.adjust','cash.close']: inp(n,approval='Approval?')
for n in ['sales.preview','sales.create']: inp(n,date='date?',van_id='id?');by[n]['input']['invoice_discount']='InvoiceDiscount?'
by['sales.create']['input']['payment']='PaymentNow?'
for n in ['sales.preview','sales.create']: inp(n,approval='Approval?')
types['SettingsPublic']={'business.name':'string','business.address':'string','business.phone':'string','games.manager_enabled':'bool','games.enabled':'bool','calc.enabled':'bool'}
types['InvoiceDiscount']={'type':'enum(none|percent|amount)','value':'int'}
types['PaymentNow']={'amount':'money','method':'enum(cash|bkash|nagad|bank|cheque)','ref':'string?','cheque':'{no:string,bank:string?,deposit_date:date?}?'}
types['Product']['needs_setup']='bool';types['Product']['setup_issues']='[string]'
types['Product']['list_price']='money?';types['Product']['original_name']='string?'
types['Product'].pop('assumed',None)
types['SaleLine']['sale_item_id']='id?';types['SaleLine']['sku']='string';types['SaleLine']['qty_base']='int';types['SaleLine']['unit_base']='int'
types['SaleLine']['invoice_discount_share']='money';types['SaleLine']['refundable_net']='money';types['SaleLine']['returned_base']='int'
types['SaleLine']['below_min_price']='bool? (OWNER ONLY)';types['SaleLine']['over_cap']='bool? (OWNER ONLY)';types['SaleLine']['needs_approval']='bool'
types['SaleLine']['cost']='money? (OWNER ONLY)'
types['Payment']['allocations']='[{sale_id:id?,invoice_no:string?,purchase_id:id?,opening:bool?,date:date?,was_due:money?,amount:money}]'
types['Payment']['credit_remaining']='money?'
types['LedgerRow']['kind']='enum(opening|sale|payment|return|refund|cancel|reversal|purchase|commission|credit_application)'
types['CustomerRow']['address']='string?'
by['commission.status']['output']['bands']='[{from_kg:int,to_kg:int?,rate_per_kg:money,kg_in_band:string,grams_in_band:int,amount:money}]'
by['commission.rules.list']['output']['rows']='[CommissionRule]'
types['CommissionRule']={'id':'id','company_id':'id?','name':'string','period':'enum(month|quarter|year)','scope':'enum(all_tea|group|product)','scope_ref':'id?','type':'enum(per_kg|slab)','per_kg':'money?','slabs':'[{from_kg:int,to_kg:int?,rate_per_kg:money}]','active':'bool','effective_from':'date'}
by['commission.rules.save']['input']={k:v for k,v in types['CommissionRule'].items() if k!='id'}; inp('commission.rules.save',id='id?')
by['products.save']['input']['list_price']='money?';inp('products.save',is_tea='bool?',group_id='id?',original_name='string?')
by['products.validate']['who']='owner'
inp('import.preview',sheet='string?');inp('import.commit',sheet='string?')
by['import.pickFile']['input']['kind']='enum(products_csv|products_xlsx|opening_csv|backup)'
inp('expenses.create',method='enum(cash|bkash|nagad|bank|cheque)?')
inp('employees.advance',method='enum(cash|bkash|nagad|bank|cheque)?')
inp('returns.create',van_id='id?')
for n in ['loadsheet.get','loadsheet.setLoaded','loadsheet.submit']:
 by[n]['input'].pop('van',None);inp(n,van_id='id?')
by['files.saveBytes']['output']={'handle':'string','name':'string'};change('files.share',input={'handle':'string'})
by['companies.save']['input'].pop('opening_due',None)
add('cash.reopen','owner',{'date':'date','reason':'string','approval':'Approval'},'{revision:int}','Preserve close, open a new revision.',True)
add('cash.preview','both',{'date':'date','counted':'money'},'{expected:money,counted:money,difference:money}','Read-only close preview.')
add('returns.preview','both',{k:v for k,v in by['returns.create']['input'].items()},'{value:money,lines:[{sale_item_id:id,qty_base:int,value:money}]}','Cumulative refund entitlement.')
add('purchases.preview','owner',copy.deepcopy(by['purchases.create']['input']),'{total:money,lines:[{product_id:id,qty_base:int,total:money}]}','Purchase totals before saving.')
add('payments.refund','owner',{'customer_id':'id','amount':'money','method':'enum(cash|bkash|nagad|bank)','reason':'string','approval':'Approval'},'{id:id,customer_due_after:money}','Refund customer credit; never negative credit.',True)
add('payments.applyCredit','owner',{'customer_id':'id','sale_id':'id','amount':'money','reason':'string'},'{applied:money}','Allocate available credit without changing ledger balance.',True)
for n in ['expenses.reverse','returns.reverse','employees.reverse']:
 add(n,'owner',{'id':'id','reason':'string','approval':'Approval'},'null','Compensating correction on open business day.',True)
add('backup.import','owner',{'handle':'string'},'{id:string}','Validate external backup selected by native dialog.',True)
add('opening.import','owner',{'cutover_date':'date','customers':'[{customer_id:id,amount:money}]?','companies':'[{company_id:id,amount:money}]?'},'{inserted:int}','Opening ledger balances; once per party.',True)
add('products.aggregate','both',{'ids':'[id]'},'{count:int,by_unit:[{unit:string,base:int}],stock_value:money?}','Compatible-unit totals, role safe.')
add('loadsheet.reopen','owner',{'id':'id','reason':'string','approval':'Approval'},'null','Preserve submitted revision and reopen.',True)
add('groups.save','owner',{'id':'id?','name':'string'},'{id:id,name:string}','Explicit product group.',True)
add('groups.list','owner',{},'{rows:[{id:id,name:string}]}','Product groups.')
by['customers.ledger']['output']['open_items']='[{sale_id:id?,opening:bool,ref:string,date:date,left:money}]'
# Explicit runtime settings. Unknown keys are invalid.
settings={
'business.name':('string','MM Traders'),'business.address':('string',''),'business.phone':('string',''),
'invoice.footer':('string','Thank you'),'invoice.default_size':('enum(58|80|a4)','80'),
'credit.mode':('enum(warn|block)','warn'),'cancel.manager_needs_approval':('bool',True),
'returns.manager_needs_approval':('bool',True),'expiry.warn_days':('int',30),
'lock.idle_minutes':('int',10),'editmode.idle_minutes':('int',10),
'games.enabled':('bool',True),'games.manager_enabled':('bool',True),'calc.enabled':('bool',True),
'commission.enabled':('bool',True),'numerals.default':('enum(latin|bengali)','latin'),
'backdate.max_days':('int',30),'invoice.discount_owner_only':('bool',True),
'cash.drawer_count':('int',1),'van.count':('int',1),'vat.enabled':('bool',False)}
public=['business.name','business.address','business.phone','invoice.footer','invoice.default_size','games.enabled','games.manager_enabled','calc.enabled','numerals.default']
types['SettingsPatch']={k:v[0]+'?' for k,v in settings.items()};by['settings.set']['input']={'patch':'SettingsPatch'}
# Parse the legacy human notation to strict JSON Schema. Generic JSON is finite and explicitly marked.
def split(s):
 out=[];start=0;depth=0
 for i,c in enumerate(s):
  if c in '{[(':depth+=1
  if c in '}])':depth-=1
  if c==',' and depth==0:out.append(s[start:i].strip());start=i+1
 out.append(s[start:].strip());return [x for x in out if x]
def clean(s):
 s=re.sub(r'\s+\((?!partial)[^)]*\)','',s).strip()
 return s[:-1] if s.endswith("?)") else s

def schema(x):
 if isinstance(x,dict):
  props={k:schema(v) for k,v in x.items()};req=[k for k,v in x.items() if not (isinstance(v,str) and clean(v).endswith('?'))]
  return {'type':'object','properties':props,'required':req,'additionalProperties':False}
 s=clean(x)
 if s.endswith('?'):return {'anyOf':[schema(s[:-1]),{'type':'null'}]}
 if s.endswith(' (partial)'):
  a=copy.deepcopy(schema(types[s.split()[0]]));a['required']=[];return a
 if s.startswith('enum('):return {'enum':s[5:-1].split('|')}
 if s in ['int','money','id']:return {'type':'integer','minimum':1 if s=='id' else -MAX,'maximum':MAX}
 if s=='bool':return {'type':'boolean'}
 if s=='null':return {'type':'null'}
 if s=='string':return {'type':'string','maxLength':1000}
 if s=='date':return {'type':'string','format':'date'}
 if s=='ts':return {'type':'string','format':'date-time'}
 if s in ['any','json','same as edits']:return {'$ref':'#/$defs/Json'}
 if s.startswith('[') and s.endswith(']'):return {'type':'array','maxItems':20000,'items':schema(s[1:-1])}
 if s.startswith('{') and s.endswith('}'):
  inner=s[1:-1]
  if inner.startswith('['):return {'type':'object','maxProperties':20000,'additionalProperties':schema(inner.split(':',1)[1].strip())}
  return schema({p.split(':',1)[0].strip():p.split(':',1)[1].strip() if ':' in p else 'string' for p in split(inner)})
 if s=='Invoice.business':return schema(types['Invoice']['business'])
 if s in types:return {'$ref':'#/$defs/'+s}
 if s=='active':return {'const':'active'}
 raise ValueError('unparsed '+repr(s))
defs={k:schema(v) for k,v in types.items() if not k.startswith('_')}
defs['Json']={'anyOf':[{'type':'null'},{'type':'boolean'},{'type':'integer','minimum':-MAX,'maximum':MAX},{'type':'string','maxLength':20000000},{'type':'array','maxItems':20000,'items':{'$ref':'#/$defs/Json'}},{'type':'object','maxProperties':20000,'additionalProperties':{'$ref':'#/$defs/Json'}}]}
# Domain-specific positive bounds.
for key in ['cartons','pcs']:
 defs['QtyIn']['properties'][key]={'anyOf':[{'type':'integer','minimum':0,'maximum':1000000000},{'type':'null'}]}
defs['QtyIn']['properties']['kg']={'anyOf':[{'type':'string','pattern':r'^\d{1,9}(\.\d{1,3})?$'},{'type':'null'}]}
extra_mut=['auth.logout','auth.lock','auth.unlock','prefs.set','invoice.data','payments.receipt','files.saveBytes','drive.uploadNow','system.clockCheck','import.pickFile']
for m in methods:
 m['mutates']=m.get('mutates',bool(m.get('audit')) or m['name'] in extra_mut)
 if m['mutates']:m['input']['request_id']='string?'
 m['input_schema']=schema(m['input']);m['output_schema']=schema(m['output'])
 if m['name']=='files.saveBytes':m['input_schema']['properties']['bytes_b64']['maxLength']=28000000
 if m['mutates']:m['input_schema']['properties']['request_id']={'anyOf':[{'type':'string','format':'uuid'},{'type':'null'}]}
 m['errors']=sorted(set(m.get('errors',[])+['VALIDATION','FORBIDDEN','UNAUTHENTICATED','LOCKED','DB','UNSUPPORTED','STATE']))
 # Explicit role restriction on invoice discount and no free-form settings.
 if 'lines' in m['input_schema']['properties']:
  m['input_schema']['properties']['lines']['minItems']=1;m['input_schema']['properties']['lines']['maxItems']=200
root={'$schema':'http://json-schema.org/draft-07/schema#','$defs':defs,'contract_version':'0.2.0','methods':methods,'events':old['events']}
(C/'methods.json').write_text(json.dumps(root,ensure_ascii=False,indent=2)+'\n')
(C/'types.json').write_text(json.dumps({'$schema':root['$schema'],'$defs':defs},ensure_ascii=False,indent=2)+'\n')
errors=json.loads((C/'legacy-0.1.0/errors.json').read_text());errors['IDEMPOTENCY_CONFLICT']='Same request_id used with different operation/payload.'
errors['RATE_LIMIT']='Too many attempts; details.retry_after_sec.'
errors['details_schema']=schema({'reason_kind':'string?','fields':'[{path:string,rule:string,message:string}]?','lines':'[json]?','recoverable':'bool?','retry_after_sec':'int?','state':'string?'})
(C/'errors.json').write_text(json.dumps(errors,indent=2)+'\n')
(C/'settings.json').write_text(json.dumps({'defaults':{k:v[1] for k,v in settings.items()},'public':public,'schema':schema(types['SettingsPatch'])},indent=2)+'\n')
(C/'events.json').write_text(json.dumps({k:schema(v.replace('idle|manual','enum(idle|manual)')) for k,v in old['events'].items() if k!='_how'},indent=2)+'\n')
(C/'approval-matrix.json').write_text(json.dumps({'ttl_seconds':120,'single_use':True,'bind':['user_id','operation','sha256(canonical payload excluding approval and request_id)'],'fresh_owner':['editmode.enable','sales.cancel','purchases.cancel','payments.reverse','payments.refund','backup.restore','license.reveal','cash.reopen','loadsheet.reopen','expenses.reverse','returns.reverse','employees.reverse'],'manager_conditional':{'sales.create':'effective discount exceeds cap/minimum or blocked credit','sales.cancel':'own same-day, no later allocation or return, and approval setting enabled'},'owner_discount':'direct, reason logged if over cap'},indent=2)+'\n')
(C/'METHODS.md').write_text('# Contract 0.2.0\n\n| Method | Role | Mutates | Summary |\n|---|---|---|---|\n'+''.join('| '+m['name']+' | '+m['who']+' | '+str(m['mutates'])+' | '+m['summary'].replace('|','/')+' |\n' for m in methods))
print('Generated',len(methods),'methods and',len(defs),'types')
