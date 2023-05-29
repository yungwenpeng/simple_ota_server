var express = require('express');
const otaApiController = require('../controllers/otaApiController');
var router = express.Router();

const { getOtaPackageInfo } = otaApiController;

router.get('/packages', getOtaPackageInfo)

module.exports = router