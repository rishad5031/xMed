// =============================================================
// xMED Government Drug Controller
// Directorate General of Health Services (DGHS) & EDCL Formulary
// =============================================================

const governmentDrugModel = require('../models/governmentDrugModel');

/**
 * GET /api/drugs/government-essential
 * Fetches officially supplied free government drugs with optional filters.
 */
function getGovernmentDrugs(req, res) {
  try {
    const { search, category, emergency } = req.query;
    const isEmergencyOnly = emergency === 'true' || emergency === '1';

    const drugs = governmentDrugModel.getAllGovernmentDrugs({
      search,
      category,
      emergency_only: isEmergencyOnly
    });

    return res.status(200).json({
      success: true,
      count: drugs.length,
      total_catalog: governmentDrugModel.GOVERNMENT_FREE_DRUGS.length,
      categories: governmentDrugModel.getDrugCategories(),
      data: drugs
    });
  } catch (error) {
    console.error('Error fetching government drugs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve government essential drug formulary.',
      error: error.message
    });
  }
}

/**
 * GET /api/drugs/emergency
 * Curated life-saving emergency drugs officially distributed at zero cost.
 */
function getEmergencyDrugs(req, res) {
  try {
    const emergencyDrugs = governmentDrugModel.getEmergencyDrugs();

    return res.status(200).json({
      success: true,
      count: emergencyDrugs.length,
      source: 'DGHS / Essential Drugs Company Limited (EDCL)',
      data: emergencyDrugs
    });
  } catch (error) {
    console.error('Error fetching emergency drugs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency life-saving medicines.',
      error: error.message
    });
  }
}

/**
 * GET /api/drugs/government-essential/:id
 * Retrieve details for a single government essential drug.
 */
function getDrugDetails(req, res) {
  try {
    const { id } = req.params;
    const drug = governmentDrugModel.getDrugById(id);

    if (!drug) {
      return res.status(404).json({
        success: false,
        message: `Government essential drug with ID ${id} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: drug
    });
  } catch (error) {
    console.error('Error fetching drug details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve drug details.',
      error: error.message
    });
  }
}

module.exports = {
  getGovernmentDrugs,
  getEmergencyDrugs,
  getDrugDetails
};
