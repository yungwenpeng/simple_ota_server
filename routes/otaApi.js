var express = require('express');
const otaApiController = require('../controllers/otaApiController');
var router = express.Router();

const { getOtaPackageInfo, downloadOtaPackage, uploadOtaPackage } = otaApiController;

router.get('/packages', getOtaPackageInfo);
router.get('/download', downloadOtaPackage);
router.post('/upload/:filename', uploadOtaPackage);

module.exports = router