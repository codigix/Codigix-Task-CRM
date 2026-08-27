import React, { useState } from "react";
import { Search, MoreVertical, Calendar } from "lucide-react";

const BlogTagsPage = () => {
  const [tags] = useState([
    { name: "Productivity", date: "17 Dec 2025", status: "Active" },
    { name: "Integration", date: "11 Dec 2025", status: "Active" },
    { name: "Integration", date: "23 Nov 2025", status: "Active" },
    { name: "Security", date: "12 Nov 2025", status: "Active" },
    { name: "Data Insights", date: "07 Nov 2025", status: "Active" },
    { name: "Automation", date: "15 Oct 2025", status: "Inactive" },
    { name: "Marketing", date: "04 Oct 2025", status: "Inactive" },
    { name: "Marketing", date: "29 Sep 2025", status: "Active" },
    { name: "User Training", date: "25 Sep 2025", status: "Inactive" },
    { name: "Security", date: "17 Sep 2025", status: "Active" }
  ]);

  const statusClasses = (status) =>
    status === "Active"
      ? "bg-green-100 text-green-600 p-1  rounded text-xs  "
      : "bg-red-100 text-red  p-1  rounded text-xs  ";

  return (
    <div className="p-6 bg-[#F8F9FA] min-h-screen">
      <h2 className="text-xl  mb-1">Blog Tags</h2>
      <p className="text-xs  text-gray-500 mb-6">Home / Blogs / Blog Tags</p>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2  text-[#1F2020] w-4 h-4" />
            <input
              className="border rounded  pl-10 pr-3 py-2 text-xs  w-60"
              placeholder="Search"
            />
          </div>

          <button className="flex items-center gap-2 text-xs  border rounded  p-2 bg-white">
            <Calendar className="w-4 h-4" />
            1 Dec 25 - 1 Dec 25
          </button>
        </div>

        <button className="bg-red-500 text-white p-2  rounded  text-xs ">
          + Add Blog Tag
        </button>
      </div>

      <div className="bg-white rounded border">
        <table className="w-full text-xs ">
          <thead>
            <tr className="border-b bg-gray-100 text-gray-600 text-xs ">
              <th className="p-3 text-left w-8">
                <input type="checkbox" />
              </th>
              <th className="p-3 text-left">Tag Name</th>
              <th className="p-3 text-left">Created Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {tags.map((item, i) => (
              <tr
                key={i}
                className="border-b hover:bg-gray-50 transition cursor-pointer"
              >
                <td className="p-3">
                  <input type="checkbox" />
                </td>
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.date}</td>
                <td className="p-3">
                  <span className={statusClasses(item.status)}>
                    {item.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <MoreVertical className="text-gray-600 cursor-pointer w-4 h-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2 text-xs ">
          Show
          <select className="border rounded p-1  text-xs ">
            <option>10</option>
            <option>20</option>
          </select>
          entries
        </div>

        <div className="flex gap-2">
          <button className="border rounded px-3 py-1">‹</button>
          <button className="bg-red-500 text-white px-3 py-1 rounded">1</button>
          <button className="border rounded px-3 py-1">›</button>
        </div>
      </div>

      <footer className="mt-6 text-xs  text-gray-500">
        Copyright © 2025 <span className="text-red-500">Preadmin</span>
      </footer>
    </div>
  );
};

export default BlogTagsPage;
