'use client'

import { useState, useCallback, useRef } from 'react'

export interface FieldValidation {
  field: string
  label: string
  validate: (value: any) => boolean
}

export interface ValidationError {
  field: string
  label: string
}

export interface ProductLineValidation {
  field: string
  label: string
  validate: (value: any) => boolean
}

export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map())

  const registerField = useCallback((fieldId: string, element: HTMLElement | null) => {
    if (element) {
      fieldRefs.current.set(fieldId, element)
    } else {
      fieldRefs.current.delete(fieldId)
    }
  }, [])

  const validateFields = useCallback((validations: FieldValidation[], formData: Record<string, any>, clearFirst: boolean = true): ValidationError[] => {
    const errors: ValidationError[] = []
    const errorFields = clearFirst ? new Set<string>() : new Set<string>(fieldErrors)

    for (const validation of validations) {
      const value = formData[validation.field]
      if (!validation.validate(value)) {
        errors.push({ field: validation.field, label: validation.label })
        errorFields.add(validation.field)
      }
    }

    setFieldErrors(errorFields)

    // Focus on first error field
    if (errors.length > 0) {
      const firstErrorField = errors[0].field
      const element = fieldRefs.current.get(firstErrorField)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        // Try to find by ID if not in refs
        const elementById = document.getElementById(firstErrorField)
        if (elementById) {
          elementById.focus()
          elementById.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    return errors
  }, [fieldErrors])

  const clearErrors = useCallback(() => {
    setFieldErrors(new Set())
  }, [])

  // Set multiple field errors at once (for combining validation results)
  const setErrors = useCallback((errors: ValidationError[]) => {
    const errorFields = new Set<string>()
    errors.forEach(e => errorFields.add(e.field))
    setFieldErrors(errorFields)

    // Focus on first error field
    if (errors.length > 0) {
      const firstErrorField = errors[0].field
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [])

  // Collect field validation errors without setting state (for combining with other validations)
  const collectFieldErrors = useCallback((validations: FieldValidation[], formData: Record<string, any>): ValidationError[] => {
    const errors: ValidationError[] = []
    for (const validation of validations) {
      const value = formData[validation.field]
      if (!validation.validate(value)) {
        errors.push({ field: validation.field, label: validation.label })
      }
    }
    return errors
  }, [])

  // Collect product line errors without setting state (for combining with other validations)
  const collectProductLineErrors = useCallback((
    productLines: any[],
    validations: ProductLineValidation[],
    checkHasData: (line: any) => boolean,
    requireFirstRow: boolean = true
  ): ValidationError[] => {
    const errors: ValidationError[] = []
    productLines.forEach((line, index) => {
      const shouldValidate = (requireFirstRow && index === 0) || checkHasData(line)
      if (!shouldValidate) return

      for (const validation of validations) {
        const fieldId = `${validation.field}-${index}`
        if (!validation.validate(line[validation.field])) {
          errors.push({ field: fieldId, label: `${validation.label} (Row ${index + 1})` })
        }
      }
    })
    return errors
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newSet = new Set(prev)
      newSet.delete(field)
      return newSet
    })
  }, [])

  const hasError = useCallback((field: string) => {
    return fieldErrors.has(field)
  }, [fieldErrors])

  const getFieldErrorProps = useCallback((field: string) => {
    const hasFieldError = fieldErrors.has(field)
    return {
      'data-error': hasFieldError ? 'true' : undefined,
      className: hasFieldError ? 'field-error' : '',
    }
  }, [fieldErrors])

  const formatErrorMessage = useCallback((errors: ValidationError[]): string => {
    if (errors.length === 0) return ''
    if (errors.length === 1) return `Please fill in the required field: ${errors[0].label}`
    const labels = errors.map(e => e.label)
    return `Please fill in the following required fields: ${labels.join(', ')}`
  }, [])

  // Validate product lines and return errors
  // requireFirstRow: if true, always validate the first row even if empty (for required items)
  const validateProductLines = useCallback((
    productLines: any[],
    validations: ProductLineValidation[],
    checkHasData: (line: any) => boolean,
    requireFirstRow: boolean = true
  ): ValidationError[] => {
    const errors: ValidationError[] = []
    const errorFields = new Set<string>(fieldErrors)

    productLines.forEach((line, index) => {
      // Always validate first row if requireFirstRow is true, otherwise check if line has data
      const shouldValidate = (requireFirstRow && index === 0) || checkHasData(line)
      if (!shouldValidate) return

      for (const validation of validations) {
        const fieldId = `${validation.field}-${index}`
        if (!validation.validate(line[validation.field])) {
          errors.push({ field: fieldId, label: `${validation.label} (Row ${index + 1})` })
          errorFields.add(fieldId)
        }
      }
    })

    setFieldErrors(errorFields)

    // Focus on first error field
    if (errors.length > 0) {
      const firstErrorField = errors[0].field
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    return errors
  }, [fieldErrors])

  // Add error to a specific field
  const addFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newSet = new Set(prev)
      newSet.add(field)
      return newSet
    })
  }, [])

  return {
    fieldErrors,
    registerField,
    validateFields,
    validateProductLines,
    collectFieldErrors,
    collectProductLineErrors,
    setErrors,
    clearErrors,
    clearFieldError,
    addFieldError,
    hasError,
    getFieldErrorProps,
    formatErrorMessage,
  }
}

// Helper to check if a value is non-empty
export const isNotEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return true
  return Boolean(value)
}

// Helper for product line validation
export const hasProductLineField = (productLines: any[], field: string): boolean => {
  return productLines.every(line => {
    const hasData = line.control_number || line.manufacturer || line.model || line.serial_number || line.sku || line.description
    if (!hasData) return true // Empty lines are ok
    return isNotEmpty(line[field])
  })
}
