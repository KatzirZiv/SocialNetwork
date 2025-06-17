import { useState, useCallback } from 'react';

const useForm = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback(
    (name, value) => {
      const rules = validationRules[name];
      if (!rules) return '';

      for (const rule of rules) {
        if (rule.required && !value) {
          return rule.message || 'This field is required';
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          return rule.message || 'Invalid format';
        }

        if (rule.minLength && value.length < rule.minLength) {
          return rule.message || `Minimum length is ${rule.minLength}`;
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          return rule.message || `Maximum length is ${rule.maxLength}`;
        }

        if (rule.min && Number(value) < rule.min) {
          return rule.message || `Minimum value is ${rule.min}`;
        }

        if (rule.max && Number(value) > rule.max) {
          return rule.message || `Maximum value is ${rule.max}`;
        }

        if (rule.validate) {
          const error = rule.validate(value, values);
          if (error) return error;
        }
      }

      return '';
    },
    [validationRules, values]
  );

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    },
    [validateField]
  );

  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, values[name]),
      }));
    },
    [validateField, values]
  );

  const handleSubmit = useCallback(
    (onSubmit) => (e) => {
      e.preventDefault();

      const newErrors = {};
      let hasErrors = false;

      Object.keys(validationRules).forEach((name) => {
        const error = validateField(name, values[name]);
        if (error) {
          newErrors[name] = error;
          hasErrors = true;
        }
      });

      setErrors(newErrors);
      setTouched(
        Object.keys(validationRules).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        )
      );

      if (!hasErrors) {
        onSubmit(values);
      }
    },
    [validateField, values, validationRules]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  }, [validateField]);

  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    isValid: Object.keys(errors).length === 0,
  };
};

export default useForm; 