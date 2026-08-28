import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = addFormats(
  new Ajv({ allErrors: true, coerceTypes: true, useDefaults: true, strict: false }),
  {
    formats: ['date-time', 'uuid']
  }
)

export default ajv
