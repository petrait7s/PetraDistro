'use strict';
const {issue}=require('../app/src/core/license');const secret=process.env.PETRA_LICENSE_SECRET;if(!secret)throw Error('PETRA_LICENSE_SECRET required');console.log(issue(process.argv[2]||'MMTR',secret));
