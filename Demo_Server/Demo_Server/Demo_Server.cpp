// Demo_Server.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"
#include "Demo_Server.h"
#include "afxsock.h"
#include <iostream>
#include <string>
#include <vector>

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

CWinApp theApp;

using namespace std;

DWORD WINAPI function_cal(LPVOID arg)
{
	SOCKET* hConnected = (SOCKET*) arg;
	CSocket mysock;
	//Chuyen ve lai CSocket
	mysock.Attach(*hConnected);
	
	int length;
	string message;

	while (true) {
		
		// nhận
		mysock.Receive(&length, sizeof(length), 0);

		vector<char> buffer(length + 1);
		int total = 0;
		while (total < length) {
			int chunk = mysock.Receive(buffer.data() + total, length - total, 0);
			if (chunk <= 0) break;
			total += chunk;
		}
		buffer[length] = '\0';
		message = buffer.data();

		// phản hồi
		string reply = "Received " + message;
		length = reply.size();
		mysock.Send(&length, sizeof(length), 0);
		mysock.Send(reply.c_str(), length, 0);
	}
	
	delete hConnected;
	return 0;
}

int _tmain(int argc, TCHAR* argv[], TCHAR* envp[])
{
	int nRetCode = 0;

	HMODULE hModule = ::GetModuleHandle(NULL);

	if (hModule != NULL)
	{
		if (!AfxWinInit(hModule, NULL, ::GetCommandLine(), 0))
		{
			_tprintf(_T("Fatal Error: MFC initialization failed\n"));
			nRetCode = 1;
		}
		else
		{
			AfxSocketInit(NULL);
			CSocket server, client;

			if (!server.Create(4567)) {
				cout << "Cannot create server socket!" << '\n';
				return 1;
			}

			cout << "Waiting for client..." << '\n';
			server.Listen();

			if (server.Accept(client)) {
				cout << "Client connected successfully!" << '\n';

				SOCKET* hConnected = new SOCKET();
				*hConnected = client.Detach();

				function_cal(hConnected);

				delete hConnected;
			}
			else {
				cout << "Failed to accept connection!" << '\n';
			}
		}
	}
	else
	{
		_tprintf(_T("Fatal Error: GetModuleHandle failed\n"));
		nRetCode = 1;
	}

	return nRetCode;
}


