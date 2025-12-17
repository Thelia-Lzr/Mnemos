// Simple compilation test
import { validateLoginForm, validateRegisterForm } from './utils/validation';

const testData = {
  email: 'test@example.com',
  password: 'TestPass123!'
};

const result = validateLoginForm(testData);
console.log('Validation result:', result);

export default result;