import React from "react";
import { Search, Calendar, MoreVertical } from "lucide-react";

const BlogCommentsPage = () => {
  const commentsData = [
    {
      name: "Darlee Robertson",
      role: "Facility Manager",
      email: "robertson@example.com",
      comment: "Great tips! I'll definitely try these out.",
      date: "17 Dec 2025",
      status: "Publish",
      image: "https://i.pravatar.cc/100?img=12"
    },
    {
      name: "Sharon Roy",
      role: "Installer",
      email: "sharon@example.com",
      comment: "Automation is a game-changer.",
      date: "11 Dec 2025",
      status: "Publish",
      image: "https://i.pravatar.cc/100?img=30"
    },
    {
      name: "Vaughan Lewis",
      role: "Senior Manager",
      email: "vaughan12@example.com",
      comment: "Best tools for integration?",
      date: "23 Nov 2025",
      status: "Publish",
      image: "https://i.pravatar.cc/100?img=40"
    },
    {
      name: "Jessica Louise",
      role: "Test Engineer",
      email: "jessica13@example.com",
      comment: "Helpful guide!",
      date: "12 Nov 2025",
      status: "Publish",
      image: "https://i.pravatar.cc/100?img=50"
    },
    {
      name: "Carol Thomas",
      role: "UI/UX Designer",
      email: "carolth03@example.com",
      comment: "Excited for new features!",
      date: "07 Nov 2025",
      status: "Publish",
      image: "https://i.pravatar.cc/100?img=60"
    },
    {
      name: "Dawn Mercha",
      role: "Technician",
      email: "dawnmercha@example.com",
      comment: "Love the focus on data-driven decisions.",
      date: "15 Oct 2025",
      status: "Unpublish",
      image: "https://i.pravatar.cc/100?img=70"
    }
  ];

  const badge = (status) =>
    status === "Publish"
      ? "bg-green-100 text-green-600 rounded p-1  text-xs"
      : "bg-red-100 text-red  rounded p-1  text-xs";

  return (
    <div className="p-6 bg-[#F8F9FA] min-h-screen">
      <h2 className="text-xl  mb-1">Blog Comments</h2>
      <p className="text-xs  text-gray-500 mb-6">Home / Blogs / Blog Comments</p>

      <div className="flex justify-between mb-4">
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
          + Add Blog Comment
        </button>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-xs ">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left w-8">
                <input type="checkbox" />
              </th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Comment</th>
              <th className="p-3 text-left">Created Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            {commentsData.map((item, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <input type="checkbox" />
                </td>

                <td className="p-3 flex items-center gap-3">
                  <img
                    src={item.image}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                  <span>
                    <p className=" ">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.role}</p>
                  </span>
                </td>

                <td className="p-3">{item.email}</td>
                <td className="p-3">{item.comment}</td>
                <td className="p-3">{item.date}</td>
                <td className="p-3">
                  <span className={badge(item.status)}>{item.status}</span>
                </td>
                <td className="p-3 text-right">
                  <MoreVertical className="text-gray-500 cursor-pointer w-4 h-4" />
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

export default BlogCommentsPage;
