import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type MdElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  disabled?: boolean
  type?: string
  value?: string | number
  label?: string
  supportingText?: string
  error?: boolean
  errorText?: string
  menuPositioning?: 'absolute' | 'fixed' | 'popover'
  headline?: string
  selected?: boolean
  indeterminate?: boolean
  hasIcon?: boolean
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'md-filled-button': MdElementProps
        'md-outlined-button': MdElementProps
        'md-text-button': MdElementProps
        'md-icon-button': MdElementProps
        'md-icon': MdElementProps
        'md-filled-text-field': MdElementProps
        'md-filled-select': MdElementProps
        'md-select-option': MdElementProps
        'md-tabs': MdElementProps
        'md-primary-tab': MdElementProps
        'md-linear-progress': MdElementProps
        'md-filled-card': MdElementProps
        'md-divider': MdElementProps
      }
    }
  }
}

export {}
