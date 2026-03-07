import PropTypes from 'prop-types';

/**
 * Reusable Input component with consistent fintech styling
 * 
 * @param {Object} props
 * @param {string} [props.type='text'] - Input type
 * @param {string} [props.id] - Input id for label association
 * @param {string} [props.name] - Input name attribute
 * @param {string} [props.value] - Controlled value
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.hasError=false] - Error state styling
 * @param {function} [props.onChange] - Change handler
 * @param {function} [props.onBlur] - Blur handler
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.autoComplete] - Autocomplete attribute
 */
export default function Input({
  type = 'text',
  id,
  name,
  value,
  placeholder,
  disabled = false,
  hasError = false,
  onChange,
  onBlur,
  className = '',
  autoComplete,
  ...props
}) {
  const baseClass = 'input';
  const errorClass = hasError ? 'input-error' : '';

  const combinedClasses = [baseClass, errorClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      onBlur={onBlur}
      className={combinedClasses}
      autoComplete={autoComplete}
      {...props}
    />
  );
}

Input.propTypes = {
  type: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  hasError: PropTypes.bool,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  className: PropTypes.string,
  autoComplete: PropTypes.string,
};
