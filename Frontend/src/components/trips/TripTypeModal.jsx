import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import toast from "react-hot-toast";
import { tripTypeService } from "../../services/tripTypeService";

export function TripTypeModal({ isOpen, onClose, tripType, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationType, setDurationType] = useState("SINGLE_DAY");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tripType) {
      setName(tripType.name || "");
      setDescription(tripType.description || "");
      setDurationType(tripType.durationType || "SINGLE_DAY");
    } else {
      setName("");
      setDescription("");
      setDurationType("SINGLE_DAY");
    }
  }, [tripType, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Trip type name is required");
      return;
    }

    const payload = { name, description, durationType };

    try {
      setIsLoading(true);
      if (tripType) {
        await tripTypeService.update(tripType._id, payload);
        toast.success("Trip type updated");
      } else {
        await tripTypeService.create(payload);
        toast.success("Trip type created");
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
      title={tripType ? "Edit Trip Type" : "Add Trip Type"}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="trip-type-modal-form" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form id="trip-type-modal-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="ui-label">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. One Way, Round Trip, Airport"
            disabled={isLoading}
            autoFocus
          />
        </div>
        <div>
          <label className="ui-label">Duration</label>
          <select
            className="ui-select"
            value={durationType}
            onChange={(e) => setDurationType(e.target.value)}
            disabled={isLoading}
          >
            <option value="SINGLE_DAY">Single day</option>
            <option value="MULTI_DAY">Multi day</option>
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Multi day trips will ask for an end date on lead / booking forms.
          </p>
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
