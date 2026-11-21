import { useEffect, useRef } from 'react'

type FieldElement = HTMLElement & { value: string }

export function useFieldValue(value: string, onChange: (value: string) => void) {
  const ref = useRef<FieldElement | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const handler = () => onChange(node.value)
    node.addEventListener('input', handler)
    node.addEventListener('change', handler)
    return () => {
      node.removeEventListener('input', handler)
      node.removeEventListener('change', handler)
    }
  }, [onChange])
  useEffect(() => {
    const node = ref.current
    if (node && node.value !== value) node.value = value
  }, [value])
  return ref
}
