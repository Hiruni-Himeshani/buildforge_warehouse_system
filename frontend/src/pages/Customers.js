import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaUserPlus, FaUsers, FaEdit, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import FormField from "../components/FormField";
import Button from "../components/Button";
import Card from "../components/Card";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [editCustomer, setEditCustomer] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    shopName: "",
    contactNumber: "",
    email: "",
    address: "",
    status: "Active",
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5001/api/manager/customers",
      );
      setCustomers(res.data);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const handleEditClick = (customer) => {
    setEditCustomer(customer);
    setFormData({
      fullName: customer.fullName,
      shopName: customer.shopName,
      contactNumber: customer.contactNumber || "",
      email: customer.email || "",
      address: customer.address || "",
      status: customer.status || "Active",
    });
    setValidationErrors({});
  };

  const handleAddCustomer = async () => {
    if (!validateForm()) {
      toast.error("Please fix validation errors before submitting");
      return;
    }

    try {
      await axios.post("http://localhost:5001/api/manager/customers", {
        fullName: formData.fullName,
        shopName: formData.shopName,
        contactNumber: formData.contactNumber,
        email: formData.email,
        address: formData.address,
      });
      setFormData({
        fullName: "",
        shopName: "",
        contactNumber: "",
        email: "",
        address: "",
        status: "Active",
      });
      setValidationErrors({});
      fetchCustomers();
      toast.success("Customer added successfully");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error(error.response?.data?.error || "Unable to add customer");
    }
  };

  const handleSave = async () => {
    if (!editCustomer) {
      toast.error("No customer selected to update");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    try {
      await axios.put(
        `http://localhost:5001/api/manager/customers/${editCustomer._id}`,
        { ...formData },
      );
      setEditCustomer(null);
      setFormData({
        fullName: "",
        shopName: "",
        contactNumber: "",
        email: "",
        address: "",
        status: "Active",
      });
      setValidationErrors({});
      fetchCustomers();
      toast.success("Customer updated successfully");
    } catch (error) {
      console.error(
        "Error saving customer:",
        error.response ? error.response.data : error.message,
      );
      toast.error(error.response?.data?.error || "Unable to save customer");
    }
  };

  const handleDelete = async (customerId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this customer? This action cannot be undone.",
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(
        `http://localhost:5001/api/manager/customers/${customerId}`,
      );
      fetchCustomers();
      toast.success("Customer deleted successfully");
    } catch (error) {
      console.error(
        "Error deleting customer:",
        error.response ? error.response.data : error.message,
      );
      toast.error(error.response?.data?.error || "Unable to delete customer");
    }
  };

  const [activeTab, setActiveTab] = useState("register");

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
  };

  const validateAddress = (address) => {
    return address.trim().length >= 10;
  };

  const validateForm = () => {
    const errors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required";
    } else if (formData.fullName.trim().length < 3) {
      errors.fullName = "Full Name must be at least 3 characters";
    }

    // Shop Name validation
    if (!formData.shopName.trim()) {
      errors.shopName = "Shop Name is required";
    } else if (formData.shopName.trim().length < 3) {
      errors.shopName = "Shop Name must be at least 3 characters";
    }

    // Contact Number validation
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = "Contact Number is required";
    } else if (!validatePhoneNumber(formData.contactNumber)) {
      errors.contactNumber =
        "Please enter a valid phone number (at least 10 digits)";
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Address validation
    if (!formData.address.trim()) {
      errors.address = "Address is required";
    } else if (!validateAddress(formData.address)) {
      errors.address = "Address must be at least 10 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <FaUsers size={24} color="#827717" />
        <h2 style={{ color: "#827717", margin: 0 }}>Customer Management</h2>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>
        <Button
          onClick={() => setActiveTab("register")}
          variant={activeTab === "register" ? "primary" : "secondary"}
          style={{
            border:
              activeTab === "register" ? "2px solid #827717" : "1px solid #ccc",
            backgroundColor: activeTab === "register" ? "#f0f4c3" : undefined,
          }}
        >
          Customer Registration
        </Button>
        <Button
          onClick={() => setActiveTab("list")}
          variant={activeTab === "list" ? "primary" : "secondary"}
          style={{
            border:
              activeTab === "list" ? "2px solid #827717" : "1px solid #ccc",
            backgroundColor: activeTab === "list" ? "#f0f4c3" : undefined,
          }}
        >
          Registered Customers
        </Button>
      </div>
      <div style={{ marginBottom: "20px", color: "#616161" }}>
        This view displays all customer records, including pending
        registrations.
      </div>

      {activeTab === "register" && (
        <Card style={{ marginBottom: "30px" }}>
          <h3 style={{ marginBottom: "15px" }}>Add New Customer</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div>
              <FormField
                label="Full Name"
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                }
                required
                style={{
                  borderColor: validationErrors.fullName
                    ? "#d32f2f"
                    : undefined,
                }}
              />
              {validationErrors.fullName && (
                <div
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    marginTop: "6px",
                  }}
                >
                  {validationErrors.fullName}
                </div>
              )}
            </div>

            <div>
              <FormField
                label="Shop Name"
                type="text"
                value={formData.shopName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, shopName: e.target.value }))
                }
                required
                style={{
                  borderColor: validationErrors.shopName
                    ? "#d32f2f"
                    : undefined,
                }}
              />
              {validationErrors.shopName && (
                <div
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    marginTop: "6px",
                  }}
                >
                  {validationErrors.shopName}
                </div>
              )}
            </div>

            <div>
              <FormField
                label="Contact Number"
                type="text"
                value={formData.contactNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactNumber: e.target.value,
                  }))
                }
                placeholder="e.g., +1-800-000-0000"
                required
                style={{
                  borderColor: validationErrors.contactNumber
                    ? "#d32f2f"
                    : undefined,
                }}
              />
              {validationErrors.contactNumber && (
                <div
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    marginTop: "6px",
                  }}
                >
                  {validationErrors.contactNumber}
                </div>
              )}
            </div>

            <div>
              <FormField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="e.g., shop@example.com"
                required
                style={{
                  borderColor: validationErrors.email ? "#d32f2f" : undefined,
                }}
              />
              {validationErrors.email && (
                <div
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    marginTop: "6px",
                  }}
                >
                  {validationErrors.email}
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <FormField
                label="Address"
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="e.g., 123 Main Street, City, State 12345"
                required
                style={{
                  borderColor: validationErrors.address ? "#d32f2f" : undefined,
                }}
              />
              {validationErrors.address && (
                <div
                  style={{
                    color: "#d32f2f",
                    fontSize: "12px",
                    marginTop: "6px",
                  }}
                >
                  {validationErrors.address}
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={handleAddCustomer}
            variant="warning"
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaUserPlus />
            Add Customer
          </Button>
        </Card>
      )}

      {activeTab === "list" && (
        <>
          <div
            style={{
              overflowX: "auto",
              borderRadius: "8px",
              border: "1px solid #cddc39",
              backgroundColor: "#f9fbe7",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#e6ee9c" }}>
                <tr>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Full Name
                  </th>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Shop Name
                  </th>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Contact Number
                  </th>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Email
                  </th>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Address
                  </th>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px", border: "1px solid #cddc39" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id} style={{ backgroundColor: "#fff" }}>
                    <td
                      style={{ padding: "12px", border: "1px solid #cddc39" }}
                    >
                      {customer.fullName}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #cddc39" }}
                    >
                      {customer.shopName}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #cddc39" }}
                    >
                      {customer.contactNumber}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #cddc39" }}
                    >
                      {customer.email}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #cddc39" }}
                    >
                      {customer.address}
                    </td>
                    <td
                      style={{ padding: "12px", border: "1px solid #cddc39" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          backgroundColor:
                            customer.status === "Active"
                              ? "#dcedc8"
                              : customer.status === "Pending"
                                ? "#fff9c4"
                                : "#ffcdd2",
                          color: "#333",
                          fontWeight: "bold",
                        }}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #cddc39",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <Button
                        onClick={() => handleEditClick(customer)}
                        variant="warning"
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <FaEdit />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(customer._id)}
                        variant="danger"
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <FaTrash />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editCustomer && (
            <Card style={{ marginTop: "20px" }}>
              <h3>Edit Customer: {editCustomer.fullName}</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div>
                  <FormField
                    label="Full Name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    required
                  />
                  {validationErrors.fullName && (
                    <div
                      style={{
                        color: "#d32f2f",
                        fontSize: "12px",
                        marginTop: "6px",
                      }}
                    >
                      {validationErrors.fullName}
                    </div>
                  )}
                </div>

                <div>
                  <FormField
                    label="Shop Name"
                    type="text"
                    value={formData.shopName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shopName: e.target.value,
                      }))
                    }
                    required
                  />
                  {validationErrors.shopName && (
                    <div
                      style={{
                        color: "#d32f2f",
                        fontSize: "12px",
                        marginTop: "6px",
                      }}
                    >
                      {validationErrors.shopName}
                    </div>
                  )}
                </div>

                <div>
                  <FormField
                    label="Contact Number"
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactNumber: e.target.value,
                      }))
                    }
                    required
                  />
                  {validationErrors.contactNumber && (
                    <div
                      style={{
                        color: "#d32f2f",
                        fontSize: "12px",
                        marginTop: "6px",
                      }}
                    >
                      {validationErrors.contactNumber}
                    </div>
                  )}
                </div>

                <div>
                  <FormField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                  />
                  {validationErrors.email && (
                    <div
                      style={{
                        color: "#d32f2f",
                        fontSize: "12px",
                        marginTop: "6px",
                      }}
                    >
                      {validationErrors.email}
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <FormField
                    label="Address"
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    required
                  />
                  {validationErrors.address && (
                    <div
                      style={{
                        color: "#d32f2f",
                        fontSize: "12px",
                        marginTop: "6px",
                      }}
                    >
                      {validationErrors.address}
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <FormField
                    label="Status"
                    type="select"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    options={[
                      { value: "Pending", label: "Pending" },
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                    ]}
                  />
                </div>
              </div>
              <Button
                onClick={handleSave}
                variant="primary"
                style={{ marginTop: "20px" }}
              >
                Save Changes
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default Customers;
