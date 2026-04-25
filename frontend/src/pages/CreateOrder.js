import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaClipboardList, FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import FormField from "../components/FormField";
import Button from "../components/Button";
import Card from "../components/Card";

function CreateOrder() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  // Array of items in the current order being built
  const [orderItems, setOrderItems] = useState([]);

  // Modal state for order summary
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // State for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch inventory and customers on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [invRes, customerRes] = await Promise.all([
          axios.get("http://localhost:5001/api/manager/inventory"),
          axios.get("http://localhost:5001/api/manager/customers"),
        ]);

        if (!invRes.data || invRes.data.length === 0) {
          setLoadError("No equipment available. Please add equipment first.");
          toast.warn("⚠️ No equipment available in inventory");
        } else {
          setInventory(invRes.data);
        }

        if (!customerRes.data || customerRes.data.length === 0) {
          setLoadError("No customers registered. Please add customers first.");
          toast.warn(
            "⚠️ No customers available. Please register customers first.",
          );
        } else {
          setCustomers(customerRes.data);
          // Auto-select first customer
          const eligible = customerRes.data[0];
          setSelectedCustomerId(eligible._id);
          setSelectedCustomerName(eligible.fullName);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const errorMsg =
          error.response?.data?.error ||
          "Failed to load customers and equipment";
        setLoadError(errorMsg);
        toast.error(`❌ ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  /**
   * Add a new equipment item to the order
   */
  const handleAddItem = () => {
    if (inventory.length === 0) {
      toast.error("No available equipment to add");
      return;
    }

    const newItem = {
      id: Date.now(), // Unique ID for this form item
      itemName: inventory[0].itemName,
      qty: 1,
    };

    setOrderItems([...orderItems, newItem]);
    toast.success("Equipment added to order");
  };

  /**
   * Update item quantity
   */
  const handleUpdateItem = (itemId, qty) => {
    const numQty = parseInt(qty) || 0;
    const updatedItems = orderItems.map((item) =>
      item.id === itemId ? { ...item, qty: Math.max(1, numQty) } : item,
    );
    setOrderItems(updatedItems);
  };

  /**
   * Update item equipment name
   */
  const handleUpdateItemName = (itemId, itemName) => {
    const updatedItems = orderItems.map((item) =>
      item.id === itemId ? { ...item, itemName } : item,
    );
    setOrderItems(updatedItems);
  };

  /**
   * Remove an item from the order
   */
  const handleRemoveItem = (itemId) => {
    setDeleteConfirm(itemId);
  };

  /**
   * Confirm removal of item
   */
  const confirmRemoveItem = () => {
    if (deleteConfirm) {
      setOrderItems(orderItems.filter((item) => item.id !== deleteConfirm));
      toast.info("🗑️ Equipment removed from order");
      setDeleteConfirm(null);
    }
  };

  /**
   * Cancel delete operation
   */
  const cancelRemoveItem = () => {
    setDeleteConfirm(null);
  };

  /**
   * Validate all items before showing summary
   */
  const validateOrder = () => {
    // Check customer selection
    if (!selectedCustomerId || !selectedCustomerId.trim()) {
      toast.error("❌ Please select a customer before proceeding");
      return false;
    }

    // Check items exist
    if (orderItems.length === 0) {
      toast.error("❌ Please add at least one equipment item to the order");
      return false;
    }

    // Validate each item
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];

      // Check equipment selected
      if (!item.itemName || item.itemName.trim() === "") {
        toast.error(`❌ Equipment #${i + 1}: Please select an equipment`);
        return false;
      }

      // Check quantity
      if (!item.qty || item.qty < 1 || isNaN(item.qty)) {
        toast.error(
          `❌ Equipment #${i + 1} (${item.itemName}): Quantity must be at least 1`,
        );
        return false;
      }

      // Check against available inventory
      const equipmentData = inventory.find(
        (inv) => inv.itemName === item.itemName,
      );

      if (!equipmentData) {
        toast.error(`❌ Equipment "${item.itemName}" not found in inventory`);
        return false;
      }

      const available =
        equipmentData.trueAvailableQty || equipmentData.availableQty || 0;

      if (item.qty > available) {
        toast.error(
          `❌ ${item.itemName}: You requested ${item.qty} units, but only ${available} are available`,
        );
        return false;
      }
    }

    // Check for duplicate equipment in order
    const equipmentNames = orderItems.map((item) => item.itemName);
    const uniqueEquipment = new Set(equipmentNames);
    if (equipmentNames.length !== uniqueEquipment.size) {
      toast.warn(
        "⚠️ You have added the same equipment multiple times. Consider consolidating quantities.",
      );
    }

    return true;
  };

  /**
   * Show order summary modal
   */
  const handlePreviewOrder = (e) => {
    e.preventDefault();
    if (validateOrder()) {
      setShowSummary(true);
    }
  };

  /**
   * Submit order after confirmation
   */
  const handleConfirmAndSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Final validation before submission
      if (!selectedCustomerId) {
        toast.error("❌ Customer is not selected");
        setIsSubmitting(false);
        return;
      }

      if (orderItems.length === 0) {
        toast.error("❌ No items in order");
        setIsSubmitting(false);
        return;
      }

      const orderPayload = {
        customerId: selectedCustomerId,
        customerName: selectedCustomerName,
        priority: priority,
        itemsRequested: orderItems.map((item) => ({
          itemName: item.itemName,
          qty: parseInt(item.qty),
        })),
      };

      const response = await axios.post(
        "http://localhost:5001/api/manager/orders",
        orderPayload,
      );

      // Success notification
      toast.success(
        "✅ Order successfully created! Confirmation email sent to customer.",
      );

      console.log("Order created:", response.data);

      // Reset form
      setOrderItems([]);
      setShowSummary(false);
      setPriority("MEDIUM");

      // Redirect after success
      setTimeout(() => {
        navigate("/approval-lobby");
      }, 1500);
    } catch (error) {
      console.error("Error creating order:", error);

      // More detailed error messages
      if (error.response?.status === 400) {
        toast.error(`⚠️ ${error.response.data.error}`);
      } else if (error.response?.status === 500) {
        toast.error("❌ Server error. Please try again later.");
      } else if (error.code === "ECONNABORTED") {
        toast.error("❌ Request timeout. Please try again.");
      } else {
        toast.error(error.response?.data?.error || "❌ Unable to create order");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Get available quantity for a specific equipment
   */
  const getAvailableQty = (itemName) => {
    const equipment = inventory.find((inv) => inv.itemName === itemName);
    return equipment
      ? equipment.trueAvailableQty || equipment.availableQty || 0
      : 0;
  };

  /**
   * Calculate total quantities per item for display
   */
  const getTotalQtyForItem = (itemName) => {
    return orderItems
      .filter((item) => item.itemName === itemName)
      .reduce((sum, item) => sum + parseInt(item.qty || 0), 0);
  };

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <p style={{ fontSize: "16px", color: "#666", margin: 0 }}>
            ⏳ Loading customers and equipment...
          </p>
        </div>
      )}

      {/* Error State */}
      {loadError && !isLoading && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#ffebee",
            border: "2px solid #e53935",
            borderRadius: "8px",
            marginBottom: "20px",
            color: "#c62828",
          }}
        >
          <strong>❌ Error:</strong> {loadError}
          <br />
          <small>
            Please contact your administrator or try refreshing the page.
          </small>
        </div>
      )}

      {/* Render form only if not loading and no error */}
      {!isLoading && !loadError && (
        <>
          <Button
            onClick={() => navigate("/approval-lobby")}
            variant="secondary"
            style={{
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaArrowLeft />
            Back to Dashboard
          </Button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <FaClipboardList size={24} color="#827717" />
            <h2 style={{ color: "#827717", margin: 0 }}>
              Create New Customer Order
            </h2>
          </div>
          <p>
            Build your order by selecting a customer and adding equipment items.
          </p>
          <hr style={{ marginBottom: "30px" }} />

          <Card>
            <form
              onSubmit={handlePreviewOrder}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Customer Selection */}
              <FormField
                label="Choose Registered Customer:"
                type="select"
                value={selectedCustomerId}
                onChange={(e) => {
                  const selected = customers.find(
                    (c) => c._id === e.target.value,
                  );
                  setSelectedCustomerId(e.target.value);
                  setSelectedCustomerName(selected ? selected.fullName : "");
                }}
                options={[
                  { value: "", label: "-- Select existing customer --" },
                  ...customers.map((customer) => ({
                    value: customer._id,
                    label: `${customer.fullName} (${customer.status})`,
                  })),
                ]}
              />

              {/* Priority Selection */}
              <FormField
                label="Priority Level:"
                type="select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: "HIGH", label: "🔴 High Priority" },
                  { value: "MEDIUM", label: "🟡 Medium Priority" },
                  { value: "LOW", label: "🟢 Low Priority" },
                ]}
              />

              <hr style={{ margin: "15px 0" }} />

              {/* Order Items Section */}
              <div
                style={{
                  backgroundColor: "#fafafa",
                  padding: "15px",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#2c3e50" }}>
                    📦 Equipment Items
                  </h3>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#27ae60",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    <FaPlus /> Add Equipment
                  </Button>
                </div>

                {orderItems.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#7f8c8d",
                      backgroundColor: "white",
                      borderRadius: "4px",
                      border: "1px dashed #bdc3c7",
                    }}
                  >
                    No equipment added yet. Click "Add Equipment" to start.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {orderItems.map((item, index) => {
                      const availableQty = getAvailableQty(item.itemName);
                      const totalQtyForItem = getTotalQtyForItem(item.itemName);
                      const isOverbooked = totalQtyForItem > availableQty;

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "flex-end",
                            backgroundColor: isOverbooked ? "#ffebee" : "white",
                            padding: "12px",
                            borderRadius: "4px",
                            border: isOverbooked
                              ? "2px solid #e53935"
                              : "1px solid #ecf0f1",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <label
                              style={{
                                fontSize: "12px",
                                color: "#7f8c8d",
                                fontWeight: "bold",
                              }}
                            >
                              Equipment {index + 1}
                            </label>
                            <select
                              value={item.itemName}
                              onChange={(e) =>
                                handleUpdateItemName(item.id, e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "8px",
                                marginTop: "4px",
                                border: "1px solid #bdc3c7",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            >
                              <option value="">-- Select Equipment --</option>
                              {inventory.map((inv) => (
                                <option key={inv.itemName} value={inv.itemName}>
                                  {inv.itemName} (Avail:{" "}
                                  {inv.trueAvailableQty ||
                                    inv.availableQty ||
                                    0}
                                  )
                                </option>
                              ))}
                            </select>
                            {item.itemName && (
                              <small
                                style={{
                                  color: "#7f8c8d",
                                  display: "block",
                                  marginTop: "4px",
                                }}
                              >
                                Available: {availableQty} | Requesting in this
                                order: {item.qty}
                                {isOverbooked && (
                                  <span style={{ color: "#e53935" }}>
                                    {" "}
                                    ❌ EXCEEDS STOCK!
                                  </span>
                                )}
                              </small>
                            )}
                          </div>

                          <div style={{ flex: 0.3 }}>
                            <label
                              style={{
                                fontSize: "12px",
                                color: "#7f8c8d",
                                fontWeight: "bold",
                              }}
                            >
                              Qty
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateItem(item.id, e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "8px",
                                marginTop: "4px",
                                border: "1px solid #bdc3c7",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Click to remove this equipment from the order"
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#e74c3c",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                style={{ marginTop: "10px" }}
                disabled={orderItems.length === 0}
              >
                ✓ Review Order
              </Button>
            </form>
          </Card>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1001,
          }}
        >
          <Card
            style={{
              maxWidth: "400px",
              width: "90%",
              padding: "30px",
            }}
          >
            <h2 style={{ color: "#e74c3c", marginTop: 0 }}>
              ⚠️ Delete Equipment?
            </h2>
            <p style={{ color: "#555", marginBottom: "20px" }}>
              Are you sure you want to remove this equipment from your order?
              This action cannot be undone.
            </p>

            {/* Show which equipment is being deleted */}
            {deleteConfirm && (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  padding: "12px",
                  borderRadius: "4px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #e74c3c",
                }}
              >
                <strong style={{ color: "#c62828" }}>
                  {orderItems.find((item) => item.id === deleteConfirm)
                    ?.itemName || "Equipment"}
                </strong>
                <span>
                  {" "}
                  (Qty:{" "}
                  {orderItems.find((item) => item.id === deleteConfirm)?.qty ||
                    0}
                  )
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <Button
                onClick={cancelRemoveItem}
                variant="secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRemoveItem}
                variant="danger"
                style={{ flex: 1 }}
              >
                Yes, Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Order Summary Modal */}
      {showSummary && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <Card
            style={{
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "30px",
            }}
          >
            <h2 style={{ color: "#2196F3", marginTop: 0 }}>📋 Order Summary</h2>

            {/* Customer Info */}
            <div
              style={{
                backgroundColor: "#e3f2fd",
                padding: "12px",
                borderRadius: "4px",
                marginBottom: "15px",
              }}
            >
              <p style={{ margin: "5px 0" }}>
                <strong>Customer:</strong> {selectedCustomerName}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Priority:</strong>{" "}
                {priority === "HIGH"
                  ? "🔴 High"
                  : priority === "MEDIUM"
                    ? "� Medium"
                    : "🟢 Low"}
              </p>
            </div>

            {/* Items Table */}
            <h3 style={{ color: "#2c3e50", marginBottom: "10px" }}>
              Equipment Items:
            </h3>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "15px",
                border: "1px solid #ecf0f1",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      borderBottom: "2px solid #bdc3c7",
                    }}
                  >
                    Equipment
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "center",
                      borderBottom: "2px solid #bdc3c7",
                    }}
                  >
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #ecf0f1" }}
                  >
                    <td style={{ padding: "10px" }}>{item.itemName}</td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {item.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Stock Validation */}
            <div
              style={{
                backgroundColor: "#f0f9ff",
                padding: "12px",
                borderRadius: "4px",
                marginBottom: "15px",
                borderLeft: "4px solid #27ae60",
              }}
            >
              <p
                style={{ margin: "5px 0", fontSize: "14px", color: "#27ae60" }}
              >
                ✅ All items have sufficient stock
              </p>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <Button
                onClick={() => setShowSummary(false)}
                variant="secondary"
                style={{ flex: 1 }}
                disabled={isSubmitting}
              >
                ← Edit Order
              </Button>
              <Button
                onClick={handleConfirmAndSubmit}
                variant="primary"
                style={{ flex: 1 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "⏳ Submitting..." : "✓ Confirm & Submit"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CreateOrder;
