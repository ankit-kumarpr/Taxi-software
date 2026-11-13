import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import toast from "react-hot-toast";
import { carTypeService } from "../../services/carTypeService";

export function CarTypeModal({ isOpen, onClose, carType, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (carType) {
      setName(carType.name || "");
      setDescription(carType.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [carType, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Car type name is required");
      return;
    }

    try {
      setIsLoading(true);
      if (carType) {
        await carTypeService.update(carType._id, { name, description });
        toast.success("Car type updated");
      } else {
        await carTypeService.create({ name, description });
        toast.success("Car type created");
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
      title={carType ? "Edit Car Type" : "Add Car Type"}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="car-type-modal-form" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form id="car-type-modal-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="ui-label">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sedan, SUV, Hatchback"
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
