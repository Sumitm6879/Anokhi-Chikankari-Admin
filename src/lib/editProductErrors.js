export const EDIT_PRODUCT_ERROR_CODES = {
  LOAD_METADATA_FAILED: 'EP-LOAD-001',
  LOAD_PRODUCT_FAILED: 'EP-LOAD-002',
  MISSING_CLOUDINARY_CREDENTIALS: 'EP-UPLOAD-001',
  NO_COLORS_SELECTED: 'EP-VALID-001',
  MISSING_COLOR_IMAGES: 'EP-VALID-002',
  SKU_CONFLICT: 'EP-VALID-003',
  UPDATE_PRODUCT_FAILED: 'EP-SAVE-001',
  UPDATE_COST_FAILED: 'EP-SAVE-002',
  DELETE_TAGS_FAILED: 'EP-SAVE-003',
  INSERT_TAGS_FAILED: 'EP-SAVE-004',
  DELETE_IMAGES_FAILED: 'EP-SAVE-005',
  INSERT_IMAGES_FAILED: 'EP-SAVE-006',
  FETCH_VARIANTS_FAILED: 'EP-SAVE-007',
  DELETE_VARIANTS_FAILED: 'EP-SAVE-008',
  UPSERT_VARIANTS_FAILED: 'EP-SAVE-009',
  AUDIT_LOG_FAILED: 'EP-AUDIT-001',
  UNEXPECTED: 'EP-UNEXPECTED-500'
};

const ERROR_COPY = {
  [EDIT_PRODUCT_ERROR_CODES.LOAD_METADATA_FAILED]: {
    title: 'Could not load product options',
    message: 'We could not load the supporting lists needed for this page. Please try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.LOAD_PRODUCT_FAILED]: {
    title: 'Could not load product',
    message: 'We could not load the product details for editing. Please refresh and try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.MISSING_CLOUDINARY_CREDENTIALS]: {
    title: 'Image upload is not configured',
    message: 'Image uploading is not configured correctly in this environment. Please contact support.',
  },
  [EDIT_PRODUCT_ERROR_CODES.NO_COLORS_SELECTED]: {
    title: 'Select at least one color',
    message: 'You need to keep at least one color selected before saving.',
  },
  [EDIT_PRODUCT_ERROR_CODES.MISSING_COLOR_IMAGES]: {
    title: 'Missing images for a color',
    message: 'Every selected color needs at least one image before the product can be saved.',
  },
  [EDIT_PRODUCT_ERROR_CODES.SKU_CONFLICT]: {
    title: 'SKU already exists',
    message: 'One of the size SKUs is already in use by another product. Please change it and try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.UPDATE_PRODUCT_FAILED]: {
    title: 'Could not save product details',
    message: 'The main product information could not be updated. Please try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.UPDATE_COST_FAILED]: {
    title: 'Could not save cost price',
    message: 'The internal cost price could not be saved. Please try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.DELETE_TAGS_FAILED]: {
    title: 'Could not update tags',
    message: 'The existing product tags could not be removed before saving new ones.',
  },
  [EDIT_PRODUCT_ERROR_CODES.INSERT_TAGS_FAILED]: {
    title: 'Could not update tags',
    message: 'The selected product tags could not be saved. Please try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.DELETE_IMAGES_FAILED]: {
    title: 'Could not clear old images',
    message: 'The current product images could not be removed before saving the new set.',
  },
  [EDIT_PRODUCT_ERROR_CODES.INSERT_IMAGES_FAILED]: {
    title: 'Could not save images',
    message: 'The selected product images could not be saved. Please try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.FETCH_VARIANTS_FAILED]: {
    title: 'Could not load existing sizes',
    message: 'We could not read the current size records needed to update this product.',
  },
  [EDIT_PRODUCT_ERROR_CODES.DELETE_VARIANTS_FAILED]: {
    title: 'Could not remove old sizes',
    message: 'Some old size records could not be cleared before saving the updated ones.',
  },
  [EDIT_PRODUCT_ERROR_CODES.UPSERT_VARIANTS_FAILED]: {
    title: 'Could not save size changes',
    message: 'The size and stock updates could not be saved. Please try again.',
  },
  [EDIT_PRODUCT_ERROR_CODES.AUDIT_LOG_FAILED]: {
    title: 'Could not record audit log',
    message: 'The product was saved, but the activity log could not be recorded.',
  },
  [EDIT_PRODUCT_ERROR_CODES.UNEXPECTED]: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred while saving the product. Please try again.',
  }
};

export const createEditProductError = ({ code, operation, message, details }) => {
  const error = new Error(message);
  error.code = code;
  error.operation = operation;
  error.details = details;
  return error;
};

export const getEditProductErrorView = (error) => {
  const code = error?.code || EDIT_PRODUCT_ERROR_CODES.UNEXPECTED;
  const copy = ERROR_COPY[code] || ERROR_COPY[EDIT_PRODUCT_ERROR_CODES.UNEXPECTED];

  return {
    code,
    title: copy.title,
    message: copy.message,
    operation: error?.operation || 'unknown',
  };
};