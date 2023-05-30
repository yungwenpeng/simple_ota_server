var express = require('express');
const otaApiController = require('../controllers/otaApiController');
var router = express.Router();

const { getOtaPackageInfo, downloadOtaPackage } = otaApiController;

router.get('/packages', getOtaPackageInfo);
router.get('/download', downloadOtaPackage);

module.exports = router