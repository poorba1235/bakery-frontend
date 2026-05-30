import * as Yup from 'yup';

// Sri Lankan Mobile Number Regex
// Supports:
// 07XXXXXXXX (10 digits)
// +947XXXXXXXX (12 characters)
// 947XXXXXXXX (11 digits)
export const slMobileRegex = /^(?:0|94|\+94)?7(0|1|2|4|5|6|7|8)\d{7}$/;

// Sri Lankan NIC Regex
// Supports:
// Old: 9 digits followed by V or X (e.g., 123456789V)
// New: 12 digits (e.g., 200012345678)
export const slNicRegex = /^(?:\d{9}[vVxX]|\d{12})$/;

export const mobileValidation = Yup.string()
    .matches(slMobileRegex, 'Invalid Sri Lankan mobile number format')
    .required('Mobile number is required');

export const nicValidation = Yup.string()
    .matches(slNicRegex, 'Invalid Sri Lankan NIC format')
    .required('NIC is required');

export const contactNumberValidation = Yup.string()
    .matches(slMobileRegex, 'Invalid contact number format');
