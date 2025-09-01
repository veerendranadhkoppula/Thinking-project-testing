// app/(frontend)/task-list/page.tsx
'use client'

import { Suspense } from 'react'
import TaskListPage from './TaskListPage'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading task list...</div>}>
      <TaskListPage />
    </Suspense>
  )
}
