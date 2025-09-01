'use client'

import { useEffect } from 'react'
import { useLoading } from '@/app/context/LoadingContext'

export default function ClientHomeMounted() {
  const { setLoading } = useLoading()

  useEffect(() => {
    setLoading(false) 
  }, [setLoading])

  return null
}
