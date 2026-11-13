import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import api from "../../services/api";
import toast from "react-hot-toast";

export function DepartmentModal({ isOpen, onClose, department, onSuccess }) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (department) {
      setName(department.name);
    } else {
      setName("");
    }
  }, [department, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }

    try {
      setIsLoading(true);
      if (department) {
        await api.patch(`/admin/departments/update/${department._id}`, { name });
        toast.success("Department updated successfully");
      } else {
        await api.post("/admin/departments/create", { name });
        toast.success("Department created successfully");
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
      title={department ? "Edit Department" : "Add Department"}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="department-modal-form" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form id="department-modal-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="ui-label">Department Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Human Resources"
            disabled={isLoading}
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}
