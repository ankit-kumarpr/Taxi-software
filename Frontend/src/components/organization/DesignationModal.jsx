import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import api from "../../services/api";
import toast from "react-hot-toast";

export function DesignationModal({ isOpen, onClose, designation, onSuccess }) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchDepartments = async () => {
        try {
          const res = await api.get("/admin/departments/list", {
            params: { status: "ACTIVE", limit: 100 },
          });
          setDepartments(res.data.data || []);
        } catch (error) {
          console.error("Failed to fetch departments", error);
        }
      };
      fetchDepartments();
    }
  }, [isOpen]);

  useEffect(() => {
    if (designation) {
      setName(designation.name);
      setDepartmentId(designation.department?._id || designation.department);
    } else {
      setName("");
      setDepartmentId("");
    }
  }, [designation, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Designation name is required");
      return;
    }
    if (!departmentId) {
      toast.error("Please select a department");
      return;
    }

    try {
      setIsLoading(true);
      if (designation) {
        await api.patch(`/admin/designations/update/${designation._id}`, { name });
        toast.success("Designation updated successfully");
      } else {
        await api.post("/admin/designations/create", { name, department: departmentId });
        toast.success("Designation created successfully");
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
      title={designation ? "Edit Designation" : "Add Designation"}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="designation-modal-form" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form id="designation-modal-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="ui-label">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={isLoading || !!designation}
            className="ui-select"
          >
            <option value="">Select a department</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="ui-label">Designation Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Manager"
            disabled={isLoading}
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}
