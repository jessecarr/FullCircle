'use client'

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
}

export function PageNavigation({ 
  showBackButton = true, 
  backButtonText = 'Return to Dashboard'
}: PageNavigationProps) {
  // Use window.location for full page navigation - this ensures browser refresh works correctly
  const navigate = (url: string) => {
    window.location.href = url
  }

  return (
    <div className="flex items-center justify-between mb-6">
      {showBackButton && (
        <Button variant="outline" onClick={() => navigate('/landing')}>
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
            <DropdownMenuItem onClick={() => navigate('/?tab=special-order')} className="cursor-pointer">
              Special Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/?tab=inbound-transfer')} className="cursor-pointer">
              Inbound Transfer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/?tab=suppressor-approval')} className="cursor-pointer">
              Suppressor Approval
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/?tab=outbound-transfer')} className="cursor-pointer">
              Outbound Transfer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/?tab=consignment')} className="cursor-pointer">
              Consignment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/?tab=quote')} className="cursor-pointer">
              Quote
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={() => navigate('/?tab=view-all')}>
          <List className="h-4 w-4 mr-2" />
          View All
        </Button>
      </div>
    </div>
  )
}
