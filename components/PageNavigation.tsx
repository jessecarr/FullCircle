'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronDown, List, ArrowLeft } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PageNavigationProps {
  showBackButton?: boolean
  backButtonText?: string
  onBackClick?: () => void
}

export function PageNavigation({ 
  showBackButton = true, 
  backButtonText = 'Return to Dashboard',
  onBackClick
}: PageNavigationProps) {
  const router = useRouter()

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.push('/landing')
    }
  }

  const handleFormSelect = (tab: string) => {
    router.push(`/?tab=${tab}`)
  }

  const handleViewAll = () => {
    router.push('/?tab=view-all')
  }

  return (
    <div className="flex items-center justify-between mb-6">
      {showBackButton && (
        <Button
          variant="outline"
          onClick={handleBackClick}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backButtonText}
        </Button>
      )}

      <div className="flex gap-2 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              New Form
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem 
              onClick={() => handleFormSelect('special-order')}
              className="cursor-pointer"
            >
              Special Order
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleFormSelect('inbound-transfer')}
              className="cursor-pointer"
            >
              Inbound Transfer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleFormSelect('suppressor-approval')}
              className="cursor-pointer"
            >
              Suppressor Approval
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleFormSelect('outbound-transfer')}
              className="cursor-pointer"
            >
              Outbound Transfer
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleFormSelect('consignment')}
              className="cursor-pointer"
            >
              Consignment
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleFormSelect('quote')}
              className="cursor-pointer"
            >
              Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={handleViewAll}>
          <List className="h-4 w-4 mr-2" />
          View All
        </Button>
      </div>
    </div>
  )
}
