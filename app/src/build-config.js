'use strict';
// Release preparation replaces this file. For development set PETRA_LICENSE_CODE (your fixed code) and/or PETRA_LICENSE_SECRET in the environment.
const {codeHash}=require('./core/license');
module.exports={licenseSecret:process.env.PETRA_LICENSE_SECRET||null,licenseCodeHash:process.env.PETRA_LICENSE_CODE?codeHash(process.env.PETRA_LICENSE_CODE):null,release:false};
