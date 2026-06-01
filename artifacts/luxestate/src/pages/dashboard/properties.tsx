import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard/page-header"
import { PropertiesTable } from "@/components/dashboard/properties-table"
import { PropertyFormModal } from "@/components/dashboard/property-form-modal"
import { PropertyDetailModal } from "@/components/dashboard/property-detail-modal"
import { Property, PropertyStatus } from "@/components/dashboard/properties-data"
import {
  useProperties, useCreateProperty, useUpdateProperty,
  useUpdatePropertyStatus, useDeleteProperty,
  propertyToInput, recordToProperty, PropertyRecord,
} from "@/lib/properties-api"
import { toast } from "sonner"

export default function PropertiesPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Property | null>(null)
  const [viewTarget, setViewTarget] = useState<Property | null>(null)

  const { data: propertiesData, isLoading } = useProperties()
  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()
  const statusMutation = useUpdatePropertyStatus()
  const deleteMutation = useDeleteProperty()

  const properties: Property[] = (propertiesData?.data ?? []).map((r) =>
    recordToProperty(r as unknown as PropertyRecord)
  )

  const handleSave = async (p: Property) => {
    const input = propertyToInput(p)
    if (editTarget) {
      const numId = parseInt(editTarget.id)
      if (!isNaN(numId)) {
        await updateMutation.mutateAsync({ id: numId, input })
        toast.success("Property updated")
      }
    } else {
      await createMutation.mutateAsync(input)
      toast.success("Property added")
    }
  }

  const handleStatusChange = async (id: string, status: PropertyStatus) => {
    const numId = parseInt(id)
    if (isNaN(numId)) return
    await statusMutation.mutateAsync({ id: numId, status })
    if (viewTarget?.id === id) {
      setViewTarget((v) => v ? { ...v, status } : v)
    }
  }

  const handleDelete = async (id: string) => {
    const numId = parseInt(id)
    if (isNaN(numId)) return
    await deleteMutation.mutateAsync(numId)
    toast.success("Property deleted")
    if (viewTarget?.id === id) setViewTarget(null)
  }

  const handleEdit = (p: Property) => {
    setViewTarget(null)
    setEditTarget(p)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Property Inventory"
        description="Manage your property portfolio. Track listings, owners, and performance."
      />

      <PropertiesTable
        properties={properties}
        isLoading={isLoading}
        setProperties={() => {}}
        onAdd={() => setAddOpen(true)}
        onEdit={(p) => setEditTarget(p)}
        onView={(p) => setViewTarget(p)}
        onDelete={handleDelete}
      />

      {/* Add modal */}
      <PropertyFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (p) => { await handleSave(p); setAddOpen(false) }}
        isSaving={isMutating}
      />

      {/* Edit modal */}
      <PropertyFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={async (p) => { await handleSave(p); setEditTarget(null) }}
        existing={editTarget}
        isSaving={isMutating}
      />

      {/* Detail panel */}
      <PropertyDetailModal
        property={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={() => viewTarget && handleEdit(viewTarget)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
