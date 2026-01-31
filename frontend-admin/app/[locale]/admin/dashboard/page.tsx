'use client';

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '@/app/context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { FaSort, FaSortUp, FaSortDown, FaTrash, FaEdit, FaFileExcel } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Lead {
  _id: string;
  name: string;
  phone: string;
  message?: string;
  createdAt: string;
  status?: string;
  notes?: string;
}

type SortField = keyof Lead;
type SortDirection = 'ascending' | 'descending';
type FilterStatus = 'All' | 'New' | 'Handled' | 'Not Relevant';

export default function LeadDashboard() {
  const { token } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortField; direction: SortDirection } | null>({ key: 'createdAt', direction: 'descending' });
  const [filter, setFilter] = useState<FilterStatus>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/leads/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to fetch leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status: newStatus } : l));

      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
      fetchLeads(); // Revert on fail
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      setLeads(prev => prev.filter(l => l._id !== id));
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/leads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead deleted');
    } catch (error) {
      toast.error('Failed to delete lead');
      fetchLeads();
    }
  };

  const openNoteModal = (lead: Lead) => {
    setEditingLead(lead);
    setNoteContent(lead.notes || '');
    setIsModalOpen(true);
  };

  const saveNote = async () => {
    if (!editingLead) return;
    try {
      setLeads(prev => prev.map(l => l._id === editingLead._id ? { ...l, notes: noteContent } : l));
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${editingLead._id}`,
        { notes: noteContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Note saved');
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    // Define Columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Message', key: 'message', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' } // Professional Blue
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    sortedLeads.forEach(lead => {
      const row = worksheet.addRow({
        name: lead.name,
        phone: lead.phone,
        message: lead.message,
        status: lead.status || 'New',
        notes: lead.notes || '',
        date: new Date(lead.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      // Conditional Formatting for Status Cell (Col 4)
      const statusCell = row.getCell(4);
      let argbColor = 'FFFFFF'; // White default

      switch (lead.status) {
        case 'Handled': argbColor = 'C6EFCE'; break; // Light Green
        case 'Not Relevant': argbColor = 'FFC7CE'; break; // Light Red
        default: argbColor = 'FFEB9C'; break; // Light Yellow (New)
      }

      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: argbColor }
      };

      // General Formatting (Borders & Alignment)
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Center align everything except Message (3) and Notes (5)
        if (colNumber !== 3 && colNumber !== 5) {
          cell.alignment = { horizontal: 'center' };
        } else {
          cell.alignment = { horizontal: 'left', wrapText: true };
        }
      });
    });

    // Auto-width adjustment (Simple approximation)
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column["eachCell"]!({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
    });

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Leads_Report.xlsx');
  };

  const filteredLeads = useMemo(() => {
    if (filter === 'All') return leads;
    return leads.filter(lead => (lead.status || 'New') === filter);
  }, [leads, filter]);

  const sortedLeads = useMemo(() => {
    let sortableItems = [...filteredLeads];
    if (sortConfig !== null) {
      const { key, direction } = sortConfig;
      sortableItems.sort((a, b) => {
        const aValue = a[key] || '';
        const bValue = b[key] || '';
        if (aValue < bValue) {
          return direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredLeads, sortConfig]);

  const requestSort = (key: SortField) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortField) => {
    if (!sortConfig || sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'ascending' ? <FaSortUp /> : <FaSortDown />;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading leads...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Leads Dashboard</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          <FaFileExcel /> Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        {['All', 'New', 'Handled', 'Not Relevant'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as FilterStatus)}
            className={`pb-2 px-4 text-sm font-medium transition ${filter === f
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto min-h-[500px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                Name {getSortIcon('name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('phone')}>
                Phone {getSortIcon('phone')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('createdAt')}>
                Date {getSortIcon('createdAt')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLeads.map((lead) => (
              <tr key={lead._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lead.message}>{lead.message || '-'}</td>

                {/* Status Dropdown */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={lead.status || 'New'}
                    onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                    className={`text-sm rounded border-gray-300 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 ${lead.status === 'Handled' ? 'bg-green-100 text-green-800' :
                        lead.status === 'Not Relevant' ? 'bg-red-100 text-red-800' :
                          'bg-blue-50 text-blue-800'
                      }`}
                  >
                    <option value="New">New</option>
                    <option value="Handled">Handled</option>
                    <option value="Not Relevant">Not Relevant</option>
                  </select>
                </td>

                {/* Notes Edit */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[100px] truncate">{lead.notes || '...'}</span>
                    <button onClick={() => openNoteModal(lead)} className="text-gray-400 hover:text-blue-600">
                      <FaEdit />
                    </button>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleString()}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button onClick={() => handleDelete(lead._id)} className="text-red-400 hover:text-red-700 mx-2">
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedLeads.length === 0 && <div className="p-8 text-center text-gray-400">No leads found in this category.</div>}
      </div>

      {/* Notes Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">Edit Notes for {editingLead?.name}</h3>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full h-32 p-2 border rounded mb-4"
              placeholder="Enter notes here..."
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button onClick={saveNote} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
