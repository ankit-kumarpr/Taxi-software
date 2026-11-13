import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import toast from "react-hot-toast";
import { vendorTypeService } from "../../services/vendorService";

export function VendorTypeModal({ isOpen, onClose, vendorType, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (vendorType) {
      setName(vendorType.name || "");
      setDescription(vendorType.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [vendorType, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vendor type name is required");
      return;
    }

    try {
      setIsLoading(true);
      if (vendorType) {
        await vendorTypeService.update(vendorType._id, { name, description });
        toast.success("Vendor type updated");
      } else {
        await vendorTypeService.create({ name, description });
        toast.success("Vendor type created");
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={isLoading ? undefined : onClose}
      title={vendorType ? "Edit Vendor Type" : "Add Vendor Type"}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="vendor-type-modal-form" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form id="vendor-type-modal-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="ui-label">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fleet Partner"
            disabled={isLoading}
            autoFocus
          />
        </div>
        <div>
          <label className="ui-label">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            disabled={isLoading}
          />
        </div>
      </form>
    </Modal>
  );
}
